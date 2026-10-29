# Notas de deploy

Contexto para a story de esqueleto e para qualquer story que mexa em deploy. Os fatos sobre o Render foram conferidos na documentação oficial em 23/10/2026. Tudo roda no Render free (D-027).

## Topologia

- API: Render Web Service (free), Root Directory `api`.
- Front: Render Static Site, Root Directory `web`.
- Banco: Render Postgres (free), **na mesma região da API** e na mesma versão major do `docker-compose.yml` (17).
  - A API usa a **Internal Database URL** (rede interna, sem SSL): `DB_SSL=false`.
  - Da máquina local (seed), usar a **External Database URL**, que exige SSL: `DB_SSL=true`.

## Blueprint (`render.yaml`)

Os três serviços estão declarados no `render.yaml` da raiz (D-034), região `virginia`. Para criar:

1. No Render: New → Blueprint, escolher o repositório e a branch.
2. O Render pede os valores marcados com `sync: false`:
   - `WEB_ORIGIN`: URL do front, esperada `https://agora-web.onrender.com`.
   - `VITE_API_URL`: URL da API, esperada `https://agora-api.onrender.com`.
3. Depois de criado, conferir as URLs reais nos serviços. Se o Render tiver adicionado sufixo ao nome,
   corrigir as duas variáveis no dashboard e fazer novo deploy (o front embute `VITE_API_URL` no build).

`sync: false` só é perguntado na criação: num sync posterior do Blueprint essas variáveis são ignoradas,
então qualquer mudança nelas é feita no dashboard. `DATABASE_URL` vem do banco por `fromDatabase`
(`connectionString` é a URL interna) e se atualiza sozinha.

## Limitações do Render free que afetam o projeto

- **Sem pre-deploy command** (só nos planos pagos). Migrations precisam rodar quando a API sobe.
  Decidido na D-031: `migrationsRun: true` no TypeORM, então o start command é só `node dist/main`.
- **Sem shell e sem one-off jobs.** Não dá para rodar comandos no servidor.
- **Filesystem efêmero**: tudo que for gravado em disco some no redeploy, no restart ou quando o serviço dorme. Nada de upload ou arquivo local.
- **Dorme após 15 min sem tráfego**; o primeiro acesso depois disso pode levar até ~1 min.
- **Uma instância só.** O SSE com eventos em memória depende disso.
- **750 h/mês por workspace**: suficiente para um serviço ligado o mês inteiro.
- **Pode reiniciar a qualquer momento**: o timer de liquidação em memória precisa ser recalculado no boot.
- **Postgres free expira 30 dias após a criação**, com mais 14 dias de carência antes de ser apagado. Sem backup. Só um Postgres free por workspace.

## Seed em produção

- Roda **da máquina local** (o Render free não tem Shell), em `api/`, apontando para a External Database URL do Render:
  ```bash
  npm ci && npm run build
  DATABASE_URL='<External Database URL>' DB_SSL=true BID_HMAC_SECRET='<o mesmo do Render>' npm run seed
  ```
- `DATABASE_URL` e `BID_HMAC_SECRET` têm que vir do ambiente do processo: o `.env` não conta para elas, e o seed para antes de subir a aplicação se faltar uma. As outras variáveis podem vir do `.env` local.
- O seed é idempotente: rodar de novo completa o que faltou sem duplicar. Se a Cleveland estiver fora no início, ele para antes de gravar; se falhar no meio (ex.: download de uma imagem), rodar de novo completa o que faltou.
- O segredo de HMAC tem que ser **exatamente o mesmo** configurado no Render. Com um segredo diferente, os lances do seed ficam com hash inválido e a auditoria acusa adulteração.
- Guardar uma cópia do `BID_HMAC_SECRET` fora do Render (é o mesmo valor usado para rodar o seed local): recriado o serviço, o Render geraria outro.
- O segredo **nunca muda depois do seed**: trocar invalida todas as assinaturas gravadas (lances, selos, aliases e comprovantes) e a auditoria passa a acusar adulteração em todos os lotes.
- `BID_HMAC_SECRET` está no `render.yaml` com `generateValue: true`, que só gera valor quando a variável ainda não existe. Criada à mão no dashboard antes do merge da 4.2, o sync do Blueprint não a substitui.

## Armadilhas de configuração

- **Porta:** a API escuta em `process.env.PORT` (o Render define a variável).
- **Versão do Node:** fixar em `engines.node` no `package.json` de cada pasta, para o Render não escolher outra.
- **devDependencies no build:** se `NODE_ENV=production` estiver definido durante o build, o `npm ci` pula as devDependencies e o `nest build` falha (o `@nestjs/cli` é dev). Não definir `NODE_ENV` como variável de build, ou usar `npm ci --include=dev`.
- **Variável do front é de build:** `VITE_API_URL` é embutida no bundle quando o Vite compila. Mudar o valor no Render exige um novo build do Static Site.
- **Rewrite do SPA:** no Static Site, em Redirects/Rewrites: origem `/*`, destino `/index.html`, ação Rewrite. Sem isso, abrir direto o link do comprovante dá 404.
- **CORS:** a API libera só a origem do Static Site, vinda de `WEB_ORIGIN`.
- **Health check:** configurar `/health` como Health Check Path no Render. Esse endpoint não toca no banco.

## Variáveis de ambiente

API (Render Web Service):
- `DATABASE_URL`: Internal Database URL do Postgres do Render
- `DB_SSL`: `false`
- `JWT_SECRET`
- `BID_HMAC_SECRET`
- `WEB_ORIGIN`: URL do Static Site
- `CLEVELAND_API_URL`: `https://openaccess-api.clevelandart.org/api`

Front (Render Static Site, valores usados no build):
- `VITE_API_URL`: URL da API

## Escopo do dia 1 (story de esqueleto)

- Nest com `/health` e uma migration inicial rodando no start.
- React com uma página inicial que chama `/health` da API, para provar que o CORS funciona.
- Os três serviços no Render (API, front e Postgres), a API conectada pela URL interna.
- GitHub Actions: lint, testes unitários, build e validação do título da PR.
- O job com Testcontainers fica para a story dos lances.
- Nenhuma regra de negócio.

## Dia da entrega: recriar o banco

O Postgres free expira 30 dias após a criação. Recriar na entrega faz os 30 dias cobrirem o processo seletivo inteiro.

1. Apagar o Postgres atual no Render. Só o banco: o `BID_HMAC_SECRET` da API continua o mesmo.
2. Rodar um sync manual do Blueprint: ele recria o `agora-db` (mesma região e versão) e o `fromDatabase` liga a nova URL interna à API.
3. Conferir na API se `DATABASE_URL` aponta para o banco novo; se não, atualizar com a nova Internal Database URL. O redeploy roda as migrations no start.
4. Conferir nos logs que as migrations rodaram e que `/health` responde.
5. Copiar o `BID_HMAC_SECRET` da API no Render (Environment) e a nova External Database URL, e rodar o seed da máquina local,
   em `api/`, com o comando da seção "Seed em produção". O lote ao vivo mais longo termina ~10 dias depois do seed.
6. Abrir a auditoria dos lotes: do nº 1 ao nº 9 íntegros, o nº 10 (cancelado) responde 404 e o nº 11 acusa `tampered` no lance 3.
7. Entrar com uma conta de demonstração do README e dar um lance num lote ao vivo.

## Fontes

- [Render Docs: Deploys](https://render.com/docs/deploys) ("The pre-deploy command is available for paid web services, private services, and background workers.")
- [Render: Deploy for Free](https://render.com/free)
