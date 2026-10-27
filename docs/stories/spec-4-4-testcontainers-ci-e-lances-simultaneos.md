---
title: 'Testcontainers, CI e lances simultâneos'
type: 'feature'
created: '2026-10-27'
status: 'done'
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
- [x] `docs/stories/sprint-status.yaml` -- 4-3 `done` (feito), 4-4 `in-progress`
- [x] `api/src/app.setup.ts`, `api/src/main.ts` -- extrai `setup(app)`
- [x] `api/package.json`, `package-lock.json` -- `@testcontainers/postgresql`; `test:e2e` com `--runInBand`
- [x] `api/test/jest-e2e.json`, `test/global-setup.ts`, `test/global-teardown.ts` -- container e envs
- [x] `api/test/app.ts` -- `start()`, `reset()`, relógio de teste, catálogo falso, helpers `signup`, `deposit`, `createLot`, `waitForLockWaiters`
- [x] `api/test/bids.e2e-spec.ts` (1-5), `concurrency.e2e-spec.ts` (6-15), `lots.e2e-spec.ts` (16-22)
- [x] `.github/workflows/ci.yml` -- job `api-e2e`
- [x] `README.md` (Testes e Rodar local: e2e exige Docker), `docs/decisions.md` (D-060, D-061), `docs/ai-log.md`, `deferred-work.md` (itens da vitrine e do 403/401 como feitos)

**Acceptance Criteria:**
- Given Docker local, when `cd api && npm run test:e2e`, then as três suítes passam.
- Given a PR, when o CI roda, then o job `api-e2e` aparece e fica verde.

## Implementation Notes

- `npm run test:e2e`: 24 testes (22 casos; o caso 22 é `it.each` com 3 linhas).
- Linha "Barreira não forma" da matriz: conferida à mão exigindo N+1 lances esperando (falha em 10 s com "only 10 of 11"); linha "Sem Docker" é de ambiente, sem teste automático.
- `package-lock.json`: só pacotes novos do Testcontainers; nenhuma versão existente mudou.
- Patch do achado 1: filtrar só por `pg_blocking_pids` da barreira contava 1 de 10, porque só o primeiro da fila espera a barreira e os demais esperam quem está à frente. A contagem virou recursiva a partir do pid da barreira.
- Depois da revisão, pedidos do usuário: casos novos "devolve o comprometido do licitante superado" e "lance nos últimos 2 min prorroga o fim em 2 min" (`bids.e2e-spec.ts`); caso 15 confere carteiras, cadeia e selo e virou `describe` próprio com `reset()`; caso 20 confere `counts.scheduled`; `timeout-minutes: 15` no job; `FakeCatalog implements Pick<CatalogService, 'find' | 'image'>`. Total: 26 testes.
- Mantidos, ao contrário do pedido: `PORT` no `globalSetup` (exigido pela validação das envs; sem `.env` no CI a app não sobe) e o `.then()` no `race()` (o supertest só envia a requisição no `then`; sem ele, "0 of 10" na barreira). Ambos com comentário do porquê.
- Variável de módulo `test` renomeada para `api` em `concurrency.e2e-spec.ts`: no topo do arquivo, o lint barra atribuir ao global do Jest.
- Antes do merge, pedido do usuário: caso "mesmo licitante em dois lotes com saldo para um só lance" com a barreira na carteira (`lockWallet`); `lockLot` e `lockWallet` usam o mesmo `hold()`, e `race()` delega a `contend()`. Total: 27 testes.

## Review Triage Log

| # | Achado | Veredito | Evidência |
|---|---|---|---|
| 1 | Contagem de espera por lock pega qualquer backend do banco, não só os bloqueados pela barreira (edge, blind, verification) | medium | `lockWaiters` filtra só `wait_event_type = 'Lock'`; a prova da disputa (ponto 1 do pedido) fica mais fraca do que diz. Patch: filtrar por `pg_blocking_pids` do pid da barreira |
| 2 | Execução em série depende só do `--runInBand` do script (edge) | medium | `npx jest --config test/jest-e2e.json` roda suítes em paralelo com `TRUNCATE` no mesmo banco. Patch: `maxWorkers: 1` na config |
| 3 | ai-log traz autorização operacional (ruleset) em "O que revisei" (blind) | low | CLAUDE.md exclui autorizações operacionais; linha removida |
| 4 | Liberação do comprometido do superado só é exercida se a ordem de chegada aceitar 2+ lances (verification) | medium | ordem livre; na prática os lances saem em ordem crescente e quase todos são aceitos, mas não é garantido. Caso novo depende do usuário |
| 5 | Lances disparados em ordem crescente quase nunca geram recusa no caso 7 (blind) | low | mesma raiz da ordem livre; embaralhar mudaria o cenário aprovado; levado ao usuário |
| 6 | Caso 7 sem asserção quando todos são 201 (blind) | false | todos 201 satisfaz "só 201 ou 422"; qualquer outro status cai no laço e falha |
| 7 | Casos 10 e 11 com `TypeError` se nenhum lance for aceito (blind) | false | o maior lance é sempre aceito (≥ qualquer mínimo); e o teste falharia de qualquer jeito |
| 8 | Caso 15 não confere carteira, cadeia nem selo do lote empatado (blind) | low | o caso aprovado é sobre as respostas; asserção nova depende do usuário |
| 9 | Caso 15 roda depois de 13 e 14 no mesmo banco (blind) | low | Jest roda os `it` em ordem de arquivo; 13 e 14 leem antes; listado |
| 10 | Anti-sniping sob concorrência sem teste (blind) | low | fora dos ACs da 4.4; caso novo depende do usuário |
| 11 | Só um código de recusa testado por HTTP (blind) | false | o AC pede "uma recusa por código"; os demais são cobertos no unitário do filter |
| 12 | Caso 20 não confere `counts.scheduled` (blind) | low | asserção extra no caso aprovado; listado |
| 13 | `FakeCatalog` sem tipo ligado ao `CatalogService` (blind) | low | estilo; listado |
| 14 | Variável `test` sombreia o `test()` global do Jest (blind) | low | estilo; listado |
| 15 | Spec diz 22 casos e o Jest reporta 24 (blind) | false | o caso 22 é `it.each` de 3 linhas; registrado nas Implementation Notes |
| 16 | Status do sprint diverge da spec (blind) | false | o passo seguinte do fluxo sincroniza |
| 17 | Job `api-e2e` sem `timeout-minutes` (blind, edge) | low | runner travado ficaria até 6 h; listado |
| 18 | `.then((r) => r)` sem efeito e `PORT` sem uso (blind) | low | estilo; listado |
| 19 | `main.ts` chamando `setup(app)` só conferido pelo build (verification) | low | função de 3 linhas, revisada; rejeitado |
| 20 | Timeout da barreira esconde a causa quando um lance falha antes do lock (edge) | low | só piora o diagnóstico; listado |
| 21 | `lockLot` vaza conexão se `startTransaction` lançar (edge) | low | raro e só em teste; rejeitado |
| 22 | `lockLot` em lote inexistente não trava nada (edge) | false | os chamadores sempre passam o lote recém-criado |
| 23 | `createLot` não devolve o relógio a `BASE` se o `POST` falhar (edge) | low | o teste já falha nesse ponto; rejeitado |

## Verification

**Commands:**
- `cd api && npm run test:e2e` -- expected: 22 casos verdes
- `cd api && npm run lint:check && npm test --silent && npm run build` -- expected: verde
