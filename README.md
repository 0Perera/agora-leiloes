# Ágora

Casa de leilões online de arte clássica europeia, com lances ao vivo e histórico auditável.

_(o que faz: lista curta de funcionalidades)_

- App: _(link do deploy)_
- API: _(link do deploy)_

## Testar agora

> O primeiro acesso pode levar até 1 min: a API dorme após 15 min sem tráfego (plano free do Render).

_(credenciais do seed e um roteiro curto de teste)_

## Rodar local

Pré-requisitos: Docker e Node 24.

```bash
# Banco (Postgres 17). Se a 5432 estiver ocupada: DB_PORT=5433 docker compose up -d
docker compose up -d

# API em http://localhost:3000. As migrations rodam sozinhas no boot.
cd api
cp .env.example .env   # ajuste a porta em DATABASE_URL se mudou DB_PORT
npm ci
npm run start:dev

# Front em http://localhost:5173 (outro terminal). A página mostra "API: ok".
cd web
cp .env.example .env
npm ci
npm run dev
```

A API não sobe se faltar variável de ambiente, e a mensagem diz qual.

Migrations (em `api/`):

```bash
npm run migration:generate -- src/database/migrations/NomeDaMudanca   # a partir das entidades
npm run migration:create -- src/database/migrations/NomeDaMudanca     # vazia
npm run migration:run                                                 # aplica (o boot também aplica)
npm run migration:revert                                              # desfaz a última
```

## Arquitetura

_(módulos, fluxo de um lance e liquidação)_

## Auditoria

_(como a técnica detecta alteração, remoção e inserção no histórico)_

## Comportamentos esperados

_(regras que podem surpreender, uma linha cada, com o porquê)_

## Testes

_(como rodar e o que cada suíte cobre)_

## Stack e decisões

_(stack e as 5 decisões principais)_. Todas as decisões e alternativas descartadas em [`docs/decisions.md`](docs/decisions.md).

## Fora do escopo

_(o que não foi feito, uma linha cada)_

## Uso de IA

_(resumo curto)_. Registro por story em [`docs/ai-log.md`](docs/ai-log.md).
