# Notas de deploy

Contexto para a story de esqueleto e para qualquer story que mexa em deploy. Os fatos sobre o Render foram conferidos na documentação oficial em 23/10/2026. Tudo roda no Render free (D-027).

## Topologia

- API: Render Web Service (free), Root Directory `api`.
- Front: Render Static Site, Root Directory `web`.
- Banco: Render Postgres (free), **na mesma região da API** e na mesma versão major do `docker-compose.yml` (17).
  - A API usa a **Internal Database URL** (rede interna, sem SSL): `DB_SSL=false`.
  - Da máquina local (seed), usar a **External Database URL**, que exige SSL: `DB_SSL=true`.

## Limitações do Render free que afetam o projeto

- **Sem pre-deploy command** (só nos planos pagos). Migrations precisam rodar quando a API sobe.
  Em aberto, decidir na story: start command `npm run migration:run && node dist/main` ou `migrationsRun: true` no TypeORM.
- **Sem shell e sem one-off jobs.** Não dá para rodar comandos no servidor.
- **Filesystem efêmero**: tudo que for gravado em disco some no redeploy, no restart ou quando o serviço dorme. Nada de upload ou arquivo local.
- **Dorme após 15 min sem tráfego**; o primeiro acesso depois disso pode levar até ~1 min.
- **Uma instância só.** O SSE com eventos em memória depende disso.
- **750 h/mês por workspace**: suficiente para um serviço ligado o mês inteiro.
- **Pode reiniciar a qualquer momento**: o timer de liquidação em memória precisa ser recalculado no boot.
- **Postgres free expira 30 dias após a criação**, com mais 14 dias de carência antes de ser apagado. Sem backup. Só um Postgres free por workspace.

## Seed em produção

- Roda **da máquina local**, apontando para a External Database URL do Render:
  `DATABASE_URL=<External Database URL> DB_SSL=true BID_HMAC_SECRET=<mesmo do Render> npm run seed`
- O segredo de HMAC tem que ser **exatamente o mesmo** configurado no Render. Com um segredo diferente, os lances do seed ficam com hash inválido e a auditoria acusa adulteração.
- Pelo mesmo motivo, trocar o segredo no Render depois do seed invalida toda a cadeia já gravada.

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

1. Apagar o Postgres atual no Render.
2. Criar um novo, mesma região da API, mesma versão major (17).
3. Atualizar `DATABASE_URL` da API com a nova Internal Database URL. O redeploy roda as migrations no start.
4. Conferir nos logs que as migrations rodaram e que `/health` responde.
5. Rodar o seed da máquina local com a nova External Database URL e o **mesmo** `BID_HMAC_SECRET` do Render.
6. Abrir a auditoria do lote do seed e confirmar que aparece como íntegro.
7. Entrar com as credenciais do README e fazer um lance de teste num lote que não seja o do seed.

## Fontes

- [Render Docs: Deploys](https://render.com/docs/deploys) ("The pre-deploy command is available for paid web services, private services, and background workers.")
- [Render: Deploy for Free](https://render.com/free)
