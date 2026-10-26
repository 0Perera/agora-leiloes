# Ágora

Casa de leilões online de arte clássica europeia, com lances ao vivo e histórico auditável.

_(o que faz: lista curta de funcionalidades)_

- App: https://agora-web-gp1g.onrender.com
- API: https://agora-api-w6z9.onrender.com (status em [`/health`](https://agora-api-w6z9.onrender.com/health))

## Testar agora

> O primeiro acesso pode levar até 1 min: a API dorme após 15 min sem tráfego (plano free do Render).

_(credenciais do seed e um roteiro curto de teste)_

## Rodar local

Tudo com Docker, num comando só (pré-requisito: Docker):

```bash
docker compose up --build
```

Front em http://localhost:5173 (mostra "API: ok"), API em http://localhost:3000, banco na 5432.
Se alguma porta estiver ocupada: `WEB_PORT=5174 API_PORT=3001 DB_PORT=5433 docker compose up --build`.
As migrations rodam sozinhas no boot da API.

Para desenvolver com hot reload (pré-requisito: Node 24), suba só o banco e rode API e front com npm:

```bash
docker compose up -d db

cd api && cp .env.example .env && npm ci && npm run start:dev   # ajuste DATABASE_URL se mudou DB_PORT
cd web && cp .env.example .env && npm ci && npm run dev         # outro terminal
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

- A sessão dura 8h e não renova: token vencido no recarregamento volta a visitante; um 401 durante o uso leva para Entrar com aviso de sessão expirada (D-006).

## Testes

_(como rodar e o que cada suíte cobre)_

## Stack e decisões

_(stack e as 5 decisões principais)_. Todas as decisões e alternativas descartadas em [`docs/decisions.md`](docs/decisions.md).

## Fora do escopo

_(o que não foi feito, uma linha cada)_

- A carteira não tem extrato de movimentações: mostra só saldo, comprometido e disponível.

## Uso de IA

_(resumo curto)_. Registro por story em [`docs/ai-log.md`](docs/ai-log.md).
