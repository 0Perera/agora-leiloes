---
title: 'Consistência da API'
type: 'refactor'
created: '2026-10-28'
status: 'done'
baseline_commit: '5b23cc71a433402898d4ba5d278075b7edd888af'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/stories/epic-6-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** o `/api` cresceu story a story e ficou com cópias (último lance, disponível, tetos do integer, `trim`, mensagem de erro do driver), nomes em mais de um padrão (assinaturas, painel, eventos, factories) e comentários que apontam para stories. O login também não tem limite de tentativas.

**Approach:** Parte A refatora sem mudar comportamento, com os testes existentes como rede. Parte B adiciona `@nestjs/throttler` só na rota de login (5 por minuto por IP), com `trust proxy` e 429 no formato da API, testes antes do código.

## Boundaries & Constraints

**Always (Parte A, itens do usuário):**
1. `LastBid` e `lastBid()` num lugar só em `bids/`, importados por bids e settlement; o comentário completo da D-042 fica ali, nos outros pontos "ver D-042".
2. `available(wallet)` em `wallets/wallet.rules.ts`, usado em `bids.service` e no DTO da carteira.
3. Comprovante: `signReceipt` e `verifyReceipt`; `sign` é só o primitivo de HMAC, que vai de `audit/sign.ts` para `common/` (D-026). Nenhum import com `as` para renomear.
4. `WalletsController.find` delega para `WalletsService.detail(userId)`.
5. Em `common/`: `trim`; `MAX_INT` no lugar dos 5 tetos do integer; a função que cria a exceção `VALIDATION_FAILED` (pipe e `LotsService`); o helper da mensagem de erro sem parâmetros da query (3 cópias); classe base de paginação para os DTOs com `page` (mesmo teto nos dois de lances).
6. `LOT_STATUSES` e `LotStatus` em `lots/lot-status.ts`.
7. Conversão para DTO no service em todo o módulo lots (só o create do controller era diferente). `LotResponseDto` vira `CreatedLotDto` (`created-lot.dto.ts`). Painel com um prefixo só (`Dashboard`) nos tipos e arquivos.
8. `LotEventsService`: `bid()` e `settled()`, mesma forma.
9. Catalog: tradução de erro só no `ClevelandClient`; sai o try/catch duplicado do `CatalogService` e o `q.trim()` repetido.
10. Sai o `export` de `PAGE_SIZE` e `START_TOLERANCE_MS`; saem `@eslint/eslintrc`, `source-map-support` e `ts-loader` (conferidos por grep: só aparecem no `package.json`).
11. Testes: `describe` com prefixo do arquivo nas funções puras (`bidRules.decide`, `settlementRules.decide`, `walletRules.deposit`, `lotRules.*`...); factories com nome do que devolvem (`makeState`, `makeLink`...); `validate` dos specs de DTO num helper único; `STARTING_BID`, `INCREMENT`, `DEPOSIT`, `createLot`, `settle` vindos de `test/app.ts`; `describe` dos e2e pela rota; `TestDatabaseModule` reaproveitando a factory do `DatabaseModule` com `poolSize`; `wallet.rules.spec` no padrão (`override`, `100_000`).
12. Comentários: o do `auth.module` ("próximas stories"); referências a story viram D-NNN ou o motivo; o do selo nulo em `lots.service` sai (fica o da entidade).
13. Log de queries ligado em desenvolvimento.

**Always (Parte B):**
- Só `POST /auth/login`: 5 tentativas por minuto por IP; `app.set('trust proxy', 1)` no Express (Render + Cloudflare; sem isso todos teriam o IP do proxy), mantido no `setup()`.
- Decisão do usuário: o IP do limite vem do `CF-Connecting-IP` quando existir, e de `req.ip` quando não existir (local e e2e), via `getTracker` sobrescrito no `LoginThrottlerGuard`. Com `trust proxy 1`, `req.ip` pode virar o IP do servidor da Cloudflare, compartilhado por muitos; a Cloudflare preenche e sobrescreve o cabeçalho, então o cliente não o falsifica.
- Decisões do usuário no checkpoint: teto de página 100 nos cinco DTOs; prefixo `Dashboard` no painel; limite alto sobrescrito no `start()` do e2e; env `DB_LOG_QUERIES`; helper `validate` em `src/common/validate.testing.ts`.
- 429 com `{ code: 'TOO_MANY_ATTEMPTS' }`; o front mostra "Muitas tentativas. Aguarde um minuto e tente de novo.".
- Os e2e existentes nunca batem no limite: a app de teste usa limite próprio.
- Decisão no `decisions.md` (D-068), com o risco do proxy e a conferência em produção.

**Never:** mexer em `currentBid` de `settlement.rules` e no teste dele (D-042); no comentário do `then()` do teste de concorrência; no nome do `LotIdPipe` (D-052). Mudar contrato JSON (só o 429 é novo). Inventar casos de teste além dos da Parte B.

## I/O & Edge-Case Matrix

| Cenário | Entrada / Estado | Esperado |
|---|---|---|
| Dentro do limite | 5 logins do mesmo IP em 1 min | todos respondem normalmente (200 ou 401) |
| Acima do limite | 6º login do mesmo IP em 1 min | 429 `{ code: 'TOO_MANY_ATTEMPTS' }` |
| CF-Connecting-IP diferentes | 5 logins com `CF-Connecting-IP: A`, depois 1 com `CF-Connecting-IP: B` | o de B não é bloqueado |
| Sem o cabeçalho | 6 logins sem `CF-Connecting-IP` | conta por `req.ip`: o 6º recebe 429 |
| Outras rotas | cadastro, lances etc. | sem limite |

</frozen-after-approval>

## Code Map

- `api/src/bids/bids.service.ts`, `settlement/settlement.service.ts` -- `LastBid`/`lastBid()` duplicados; `available()` local; `events.publish`; comentário "timer da 5.3, seed da 6.1".
- `api/src/audit/sign.ts` -> `common/sign.ts`; usado por `audit/alias.ts`, `audit/chain.ts`, `receipts/receipt.signature.ts` (+ spec, hoje com `sign as signFields`); `chain.ts` importa `verify as verifyReceipt`.
- `api/src/receipts/receipts.service.ts`, `settlement.service.ts` -- chamam `verify`/`sign` do comprovante.
- `api/src/wallets/{wallet.rules.ts,wallets.controller.ts,wallets.service.ts,dto/wallet-response.dto.ts}` -- `MAX_BALANCE`, conversão no controller, `available` no DTO.
- Tetos `2_147_483_647`: `bids/dto/place-bid.dto.ts`, `lots/dto/create-lot.dto.ts`, `lots/lot-id.pipe.ts`, `lots/dto/list-lots-query.dto.ts`, `wallets/wallet.rules.ts`.
- `trim`: `auth/dto/trim.ts` (+ cópias em `catalog/dto/search-query.dto.ts` e `lots/dto/list-lots-query.dto.ts`).
- Mensagem do driver: `common/query-failed.filter.ts`, `settlement/settlement.timer.ts` (`reason`), `lots/lots.service.ts` (`failure`).
- `VALIDATION_FAILED`: `common/validation.pipe.ts`, `lots/lots.service.ts` (`invalid`).
- DTOs com `page`: `catalog/dto/search-query.dto.ts`, `bids/dto/bid-history-query.dto.ts` (teto 100_000), `bids/dto/my-bids-query.dto.ts`, `lots/dto/dashboard-query.dto.ts`, `lots/dto/list-lots-query.dto.ts` (teto 100).
- `api/src/lots/` -- `lot-status.ts` importa `LotStatus` de `dto/lot-card.dto.ts`; `lots.controller.ts` converte o create; `dto/lot-response.dto.ts`; painel mistura `Book*` e `Dashboard*` (`dashboard.service.ts`, `dto/dashboard-{book,lot,query}.dto.ts`); `lot-events.service.ts` (`publish`/`settled`).
- `api/src/catalog/catalog.service.ts` -- `call()` e try/catch do `image()` repetem o que o `ClevelandClient` já traduz; `q.trim()` repete o `@Transform(trim)`.
- `api/src/lots/lot.rules.ts`, `catalog/catalog.service.ts` -- `export` de `START_TOLERANCE_MS`/`PAGE_SIZE` sem uso externo.
- `api/test/app.ts` -- `TestDatabaseModule` copia a factory; e2e repetem `STARTING_BID`, `INCREMENT`, `DEPOSIT`, `createLot`, `settle`.
- `api/src/database/database.options.ts`, `config/env.validation.ts` -- logger sem `query`; envs.
- `api/src/auth/auth.controller.ts`, `app.setup.ts`, `common/domain.exception.ts`, `common/domain-exception.filter.ts` -- Parte B.
- `web/src/features/auth/auth-errors.ts` (+ spec) -- tradução do 429.
- Seed (`api/src/seed/seed.ts`) usa `LotsService.create` (`id`, `number`, `title`): o retorno continua com esses campos.

## Tasks & Acceptance

**Execution:**
- [x] `api/src/common/` -- criar `sign.ts` (movido), `trim.ts`, `max-int.ts` (`MAX_INT`), `validation-failed.ts` (`validationFailed(fields)`), `error-message.ts` (`errorMessage(error)`), `page-query.dto.ts` (`PageQueryDto`, `page` 1..100) -- item 5 e 3.
- [x] `api/src/bids/last-bid.ts` -- `LastBid` + `lastBid(manager, lotId)` com o comentário da D-042; bids e settlement importam -- item 1.
- [x] `api/src/wallets/` -- `available()` e `MAX_INT` nas regras; `WalletsService.detail`; controller fino -- itens 2 e 4.
- [x] `api/src/receipts/receipt.signature.ts` -- `signReceipt`/`verifyReceipt`; atualizar chain, receipts e settlement -- item 3.
- [x] `api/src/lots/` -- `lot-status.ts` dono do status; `created-lot.dto.ts`; service devolve `CreatedLotDto`; painel `Dashboard*` (`DashboardPageDto` em `dashboard-page.dto.ts`, `DashboardCountsDto`, `DashboardResultDto`, `DashboardStatus`, `DashboardFilter`); `bid()`/`settled()` -- itens 6, 7, 8.
- [x] `api/src/catalog/` -- tirar `call()`/try/catch e `trim` do service; `PAGE_SIZE` sem export -- itens 9, 10.
- [x] `api/package.json` -- remover as três devDependencies; adicionar `@nestjs/throttler` -- item 10 e Parte B.
- [x] specs unitários e `api/test/` -- renomeações do item 11; helper `validate` em `src/common/validate.testing.ts` (ver Design Notes).
- [x] comentários do item 12; `DB_LOG_QUERIES` (item 13) em `env.validation.ts`, `database.options.ts`, `.env.example`.
- [x] Parte B: e2e `api/test/auth.e2e-spec.ts` primeiro (vermelho); depois `LoginThrottlerGuard` em `auth/`, `ThrottlerModule` no `AuthModule`, `trust proxy` no `setup`, código `TOO_MANY_ATTEMPTS` (429), front e `decisions.md` (D-068).

**Acceptance Criteria:**
- Given a Parte A, when a suíte roda, then unitários, e2e, lint e build passam sem alterar teste de comportamento (só nomes, imports e factories).
- Given o repositório, when se procura `2_147_483_647`, `function trim`, `as signFields`, `as verifyReceipt` ou `type LastBid` fora do lugar único, then não há cópias.
- Given a Parte B, when os e2e existentes rodam, then nenhum recebe 429.
- Given login bloqueado, when o front recebe 429, then mostra "Muitas tentativas. Aguarde um minuto e tente de novo.".

## Review Triage Log

| # | Achado (edge-case-hunter) | Veredito | Evidência | Rota |
|---|---|---|---|---|
| 1 | `CF-Connecting-IP` vazio vira um contador único | low | `??` mantinha `''`; corrigido com `trim()` e `\|\|` | patch |
| 2 | `CF-Connecting-IP` forjado fora da Cloudflare | low | Decisão do usuário; no Render a Cloudflare sobrescreve o cabeçalho; risco registrado na D-068 | rejeitado |
| 3 | `trust proxy 1` sem proxy (local/compose) deixa `X-Forwarded-For` virar `req.ip` | low | Pedido explícito do usuário; local/compose não são expostos | rejeitado |
| 4 | Login com sucesso também conta no limite | false | A matriz aprovada conta toda tentativa (200 ou 401) | rejeitado |
| 5 | `TestApp.settle` com lote que acaba depois de `at(30)` não liquida | false | Todos os chamadores criam o lote com `endsAt: at(30)` | rejeitado |
| 6 | Histórico de lances recusa página > 100 | false | Teto único de 100 aprovado pelo usuário no checkpoint | rejeitado |
| 7 | Catalog: erro não-domínio do client viraria 500 | false | `ClevelandClient.get/download/readLimited` capturam toda falha de rede e de corpo e lançam `DomainException` | rejeitado |
| 8 | Teste do cache do catalog deixa de cobrir o trim | low | O trim é do DTO (item 9) e o `search-query.dto.spec` cobre | rejeitado |
| 9 | `2147483647` literal no SQL do e2e de liquidação | low | Dado de teste, não teto de validação | rejeitado |

## Design Notes

- Teto de página: `PageQueryDto` com `@Max(100)` para os cinco DTOs. O histórico de lances perde o teto de 100_000 (100 páginas de 20 = 2000 lances, folga para o escopo); é o "mesmo teto" pedido.
- Helper de validação dos specs de DTO: `src/common/validate.testing.ts` exportando `validate(metatype, value, type = 'body')`, que roda o `validationPipe()` e devolve o corpo do 400 ou `undefined`. Fora do padrão `*.spec.ts`, não roda como suíte.
- Limite no e2e: `start()` sobrescreve as opções do `ThrottlerModule` com limite alto; a suíte do login sobe a app com o limite real (5).
- Log de queries: env opcional `DB_LOG_QUERIES` (padrão `false`; `.env.example` com `true`); liga `'query'` no `SafeLogger`, que já descarta parâmetros.

## Verification

**Commands:**
- `cd api && npm run lint:check && npx tsc --noEmit -p tsconfig.json && npm test --silent && npm run test:e2e && npm run build` -- expected: tudo verde
- `cd web && npm run lint:check && npm test && npm run build` -- expected: tudo verde
