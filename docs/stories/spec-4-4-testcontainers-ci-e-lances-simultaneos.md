---
title: 'Testcontainers, CI e lances simultâneos'
type: 'feature'
created: '2026-10-27'
status: 'in-progress'
baseline_commit: '3e66ccddc3449217812cc79c3d71c7ecb4e636ed'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/stories/epic-4-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** o motor de lances (4.3) só tem testes unitários com `manager` falso: nada prova que lances simultâneos contra um Postgres real mantêm a cadeia, o selo, o lote e os saldos íntegros, nem que a borda HTTP (guards, pipe, filter) responde certo.

**Approach:** `npm run test:e2e` sobe um Postgres real com `@testcontainers/postgresql`, a API inteira (`AppModule`, migrations no boot) com o `Clock` trocado por um relógio de teste e o catálogo da Cleveland por um falso, e roda três suítes HTTP (supertest): lances, concorrência e vitrine. Job `api-e2e` no CI.

## Boundaries & Constraints

**Always:**
- App de teste igual à de produção: `AppModule`, mesmos pipe e filters globais (extraídos de `main.ts` para uma função reaproveitada), migrations aplicadas pelo `migrationsRun` do boot. Só trocam: `DatabaseModule` (mesmas opções + `poolSize` 20), `Clock` (relógio de teste com `set()`) e `CatalogService` (falso, sem rede).
- Lotes criados por `POST /lots` com o leiloeiro, como o seed (D-045): o relógio de teste é posto na hora desejada antes de criar (ex.: no passado para lote encerrado) e depois na hora dos lances. Nenhum `INSERT` direto em `lots` ou `bids`.
- **Disputa real pelo lock (barreira):** uma conexão à parte abre transação e trava a linha do lote (`SELECT ... FOR UPDATE`); os N `POST /lots/:id/bids` são disparados sem `await`; o teste consulta `pg_stat_activity` até ver N backends distintos (`pid`) com `wait_event_type = 'Lock'` (timeout de 10 s, senão falha); só então faz `COMMIT` e espera as respostas. Isso prova N conexões separadas, todas em voo e paradas no mesmo lock; sem a barreira, os lances poderiam rodar em fila e o teste não provaria nada. O pool (20) é maior que N + a conexão da barreira + a da consulta.
- N = 10 licitantes, cada um com depósito suficiente; o licitante i oferece `startingBid + i × increment`. A ordem de chegada é livre, então um lance menor que chega depois de um maior é recusado: as asserções valem para qualquer ordem.
- Conferência depois dos lances, lendo o banco: `seq` de 1 a k sem buraco nem repetição (k = nº de 201); cada `prev_hash` = hash anterior (`GENESIS` no 1º) e cada `hash` = `hashBid()` recalculado; `lots.seal` = `sealLot()` recalculado com k e o último hash; `current_bid`/`bid_count` = valor/`seq` do último lance; carteiras.
- Banco único para a execução: `globalSetup` sobe o container e exporta as envs; `globalTeardown` derruba; suítes em série (`--runInBand`); cada suíte começa com `TRUNCATE ... RESTART IDENTITY CASCADE` das tabelas de dados (nunca a de migrations).
- Job `api-e2e` em `.github/workflows/ci.yml`, nos mesmos gatilhos do CI (PR e push na `main`): `npm ci` + `npm run test:e2e`, Docker do runner.
- Dependência nova só `@testcontainers/postgresql` (devDependency aprovada), imagem `postgres:17` (a do compose).

**Decisões do usuário:**
- Catálogo falso no módulo de teste, devolvendo a peça e também a imagem para a criação do lote; o download real já tem teste unitário desde a 3.2 (D-060).
- Um container para a execução inteira, suítes em série, tabelas limpas no começo de cada suíte (D-061).
- `api-e2e` entra na ruleset `main-protection` pela interface, feito pelo usuário depois do primeiro run verde. O agente não altera a ruleset.
- `setup(app)` extraído num commit `refactor` separado. Casos 1 a 22 aprovados.

**Never:**
- Alterar a ruleset do GitHub; chamar a Cleveland de verdade; mudar comportamento de produção; `setTimeout` como prova de simultaneidade; testes de auth da 2.1 (fica no `deferred-work.md`); SSE e histórico (4.5).

**Casos de teste propostos (teste depois):**

`describe('POST /lots/:id/bids')` (`bids.e2e-spec.ts`):
1. aceita o lance com 201 e devolve seq, valor, alias, data e fim
2. compromete o valor do lance na carteira do licitante
3. recusa lance abaixo do mínimo com 422 e o mínimo aceito
4. responde 403 `ROLE_NOT_ALLOWED` ao leiloeiro
5. responde 401 sem token

`describe('lances simultâneos')` (`concurrency.e2e-spec.ts`, cenário dos N lances no `beforeAll`):
6. os N lances esperaram o lock do lote em conexões separadas
7. responde só 201 ou 422 `BID_BELOW_MINIMUM`
8. grava os seq contínuos de 1 até o número de lances aceitos
9. mantém a cadeia de hashes válida
10. mantém o selo do lote igual ao recálculo
11. mantém lance atual e contagem iguais ao último lance
12. deixa o maior lance como líder final
13. compromete valor só na carteira do líder final
14. mantém saldo maior ou igual ao comprometido, e comprometido não negativo, em todas as carteiras
15. dois lances simultâneos do mesmo mínimo: um aceito e o outro `BID_BELOW_MINIMUM` (mesma barreira, N = 2)

`describe('vitrine')` (`lots.e2e-spec.ts`):
16. destaque responde 204 sem lotes
17. destaque cai para o agendado mais próximo sem lote ao vivo
18. destaque prefere o ao vivo que termina primeiro ao agendado
19. destaque prefere o ao vivo com maior lance atual
20. lote cancelado fica fora de `GET /lots`, `/lots/featured` e `/lots/:id` (404)
21. counts das três abas aplicam o `q`
22. ordem de cada aba (`it.each`): ao vivo por fim crescente, agendados por início crescente, encerrados por fim decrescente

## I/O & Edge-Case Matrix

| Cenário | Entrada / estado | Resultado |
|---|---|---|
| N lances juntos | 10 licitantes, valores distintos, barreira no lock | só 201/`BID_BELOW_MINIMUM`; invariantes acima; maior lance lidera |
| Mesmo mínimo | 2 lances = `startingBid` | um 201, outro 422 `BID_BELOW_MINIMUM` com `minimum` = inicial + incremento |
| Barreira não forma | menos de N esperando em 10 s | teste falha (não passa por sorte) |
| Sem Docker | `npm run test:e2e` | falha no `globalSetup` com o erro do Testcontainers |

</frozen-after-approval>

## Code Map

- `api/src/main.ts` -- pipe e filters globais; extrair para `api/src/app.setup.ts` (`setup(app)`), usado por `main.ts` e pelo e2e (commit `refactor` separado).
- `api/src/database/database.module.ts`, `database.options.ts` -- `databaseOptions(env)` reaproveitado no módulo de banco do teste, + `migrationsRun: true`, `poolSize: 20`; trocar com `Test.createTestingModule({ imports: [AppModule] }).overrideModule(DatabaseModule)`.
- `api/src/common/clock.ts` -- `overrideProvider(Clock).useValue(clock)`.
- `api/src/catalog/catalog.service.ts` (`find(id)`, `image(url)`), `artwork.mapper.ts` (`ArtworkDetail`) -- forma do falso; título por `artworkId` configurável (para o `q`).
- `api/src/lots/lots.service.ts` -- `featuredChain` (D-037), `STATUS_ORDER`, `scheduleErrors` (início aceita até 60 s no passado). Cancelamento: `POST /lots/:id/cancel` (sem lance, não encerrado).
- `api/src/bids/bids.service.ts` -- motor sob teste; não alterar.
- `api/src/audit/chain.ts` -- `GENESIS`, `hashBid(secret, BidLink)`, `sealLot(secret, { lotId, count, lastHash })` para o recálculo.
- Rotas: `POST /auth/signup` (`{ token, user }`), `POST /wallet/deposits` (`amount` 100..10.000.000), `POST /lots`, `GET /lots?status=&q=`, `GET /lots/featured` (204 sem lote), `GET /lots/:id`, `GET /wallet`.
- `api/test/jest-e2e.json` -- já existe; acrescentar `globalSetup`, `globalTeardown`, `testTimeout`.
- `.github/workflows/ci.yml` -- job novo `api-e2e`.

## Tasks & Acceptance

**Execution:**
- [ ] `docs/stories/sprint-status.yaml` -- 4-3 `done` (feito), 4-4 `in-progress`
- [ ] `api/src/app.setup.ts`, `api/src/main.ts` -- extrai `setup(app)`
- [ ] `api/package.json`, `package-lock.json` -- `@testcontainers/postgresql`; `test:e2e` com `--runInBand`
- [ ] `api/test/jest-e2e.json`, `test/global-setup.ts`, `test/global-teardown.ts` -- container e envs
- [ ] `api/test/app.ts` -- `start()`, `reset()`, relógio de teste, catálogo falso, helpers `signup`, `deposit`, `createLot`, `waitForLockWaiters`
- [ ] `api/test/bids.e2e-spec.ts` (1-5), `concurrency.e2e-spec.ts` (6-15), `lots.e2e-spec.ts` (16-22)
- [ ] `.github/workflows/ci.yml` -- job `api-e2e`
- [ ] `README.md` (Testes e Rodar local: e2e exige Docker), `docs/decisions.md` (D-060, D-061), `docs/ai-log.md`, `deferred-work.md` (itens da vitrine e do 403/401 como feitos)

**Acceptance Criteria:**
- Given Docker local, when `cd api && npm run test:e2e`, then as três suítes passam.
- Given a PR, when o CI roda, then o job `api-e2e` aparece e fica verde.

## Verification

**Commands:**
- `cd api && npm run test:e2e` -- expected: 22 casos verdes
- `cd api && npm run lint:check && npm test --silent && npm run build` -- expected: verde
