# Desenvolvimento

Como rodar com hot reload fora do compose, mexer no schema e conhecer as limitações do Render free. O caminho rápido (`docker compose up --build`) está no [README](../README.md#iv--rodar-local).

## Hot reload

Só o banco no compose; API e front direto no Node (versão em `engines.node` de cada `package.json`):

```bash
docker compose up -d db
cd api && cp .env.example .env && npm ci && npm run start:dev   # http://localhost:3000
cd web && cp .env.example .env && npm ci && npm run dev         # http://localhost:5173
```

As migrations rodam no boot da API (D-031). `DB_LOG_QUERIES=true` loga cada query, para conferir quantas uma tela dispara.

## Migrations

O schema só muda por migration versionada (`synchronize: false` sempre). Com o banco no ar, em `api/`:

```bash
npm run migration:generate -- src/database/migrations/<Nome>   # gera a partir das entidades; revisar antes de commitar
npm run migration:run
npm run migration:revert
```

Migration já aplicada nunca é editada: a correção vem numa migration nova.

## Seed fora do compose

Em `api/`, com o `.env` apontando para o banco:

```bash
npm run build && npm run seed
```

`DATABASE_URL` e `BID_HMAC_SECRET` precisam vir do ambiente do processo ou do `.env`; o seed para antes de subir a aplicação se faltar uma. O segredo tem que ser o mesmo da API: com outro, os lances do seed ficam com hash inválido e a auditoria acusa adulteração.

## Topologia no Render

Tudo no Render free (D-027), declarado no `render.yaml` da raiz (D-034), região `virginia`.

- API: Web Service, Root Directory `api`.
- Front: Static Site, Root Directory `web`.
- Banco: Postgres, **na mesma região da API** e na mesma versão major do `docker-compose.yml` (17).
  - A API usa a **Internal Database URL** (rede interna, sem SSL): `DB_SSL=false`.
  - Da máquina local, só a **External Database URL**, que exige SSL: `DB_SSL=true`.

## Limitações do plano free

- **Sem pre-deploy command** (só nos planos pagos): as migrations rodam quando a API sobe (`migrationsRun: true`, D-031), e o start command é só `node dist/main`.
- **Sem shell e sem one-off jobs:** não dá para rodar comandos no servidor; o seed roda da máquina local.
- **Filesystem efêmero:** o que for gravado em disco some no redeploy, no restart ou quando o serviço dorme. Nada de upload ou arquivo local.
- **Dorme após 15 min sem tráfego:** o primeiro acesso depois disso pode levar até ~1 min.
- **Uma instância só:** o SSE com eventos em memória depende disso.
- **750 h/mês por workspace:** suficiente para um serviço ligado o mês inteiro.
- **Pode reiniciar a qualquer momento:** o timer de liquidação em memória é recalculado no boot.
- **Postgres expira 30 dias após a criação**, com mais 14 dias de carência antes de ser apagado. Sem backup. Só um Postgres free por workspace.

## Armadilhas de configuração

- **Porta:** a API escuta em `process.env.PORT` (o Render define a variável).
- **Versão do Node:** fixada em `engines.node` no `package.json` de cada pasta, para o Render não escolher outra.
- **devDependencies no build:** com `NODE_ENV=production` no build, o `npm ci` pula as devDependencies e o `nest build` falha (o `@nestjs/cli` é dev). Não definir `NODE_ENV` como variável de build, ou usar `npm ci --include=dev`.
- **Variável do front é de build:** `VITE_API_URL` é embutida no bundle quando o Vite compila. Mudar o valor no Render exige um novo build do Static Site.
- **Rewrite do SPA:** no Static Site, origem `/*`, destino `/index.html`, ação Rewrite. Sem isso, abrir direto o link do comprovante dá 404.
- **CORS:** a API libera só a origem do Static Site, vinda de `WEB_ORIGIN`.
- **Health check:** `/health` como Health Check Path no Render. Esse endpoint não toca no banco.
- **`sync: false` no Blueprint:** `WEB_ORIGIN` e `VITE_API_URL` só são perguntadas na criação; num sync posterior são ignoradas, então mudança nelas é feita no dashboard.
