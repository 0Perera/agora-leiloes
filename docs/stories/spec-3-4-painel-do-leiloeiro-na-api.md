---
title: 'Painel do leiloeiro na API'
type: 'feature'
created: '2026-10-26'
status: 'done'
baseline_commit: '09ea326bd31f6c30cd8265e058ab02f15daecd43'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/stories/epic-3-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** o leiloeiro cria lotes (3.2), mas não vê os próprios lotes nem consegue tirar da vitrine um lote publicado errado. A tela do painel (3.5) precisa do livro, do resumo e do cancelamento.

**Approach:** `GET /dashboard/lots` (livro paginado com contagem por filtro), `GET /dashboard/summary` (resumo) e `POST /lots/:id/cancel`, todos `@Auth('AUCTIONEER')` e restritos a `auctioneer_id = user.id`. Status calculado no SQL com o `now` do `Clock` (D-010); cancelamento em transação com `FOR UPDATE` no lote.

## Boundaries & Constraints

**Always:**
- Toda query filtra `auctioneer_id = :userId`. Lote de outro leiloeiro nunca aparece; cancelar responde 404 (mesma resposta de inexistente).
- `GET /dashboard/lots` query (DTO): `status` (`all|live|scheduled|ended|cancelled`, padrão `all`), `page` (1..100, padrão 1). Erro → 400 `VALIDATION_FAILED`.
- Status do livro: `cancelled` se `cancelled_at IS NOT NULL`, senão o mesmo `CASE` da vitrine. Filtros `live|scheduled|ended` exigem `cancelled_at IS NULL`; `all` traz todos, inclusive cancelados.
- Ordem: `number DESC` em todos os filtros (o mais novo no topo, como no canvas).
- Resposta: `{ items, page, pageSize: 20, total, counts: { all, live, scheduled, ended, cancelled } }`; `total = counts[status]`. Item: `id`, `number`, `title`, `artist`, `status`, `startingBid`, `currentBid` (nulo), `bidCount`, `startsAt`, `endsAt`.
- Resumo (só não cancelados): `{ live: { count, currentBidTotal }, scheduled: { count, nextStartsAt } , ended: { count, withoutBids } }`. `currentBidTotal` em centavos (0 sem lance); `nextStartsAt` nulo sem agendado; `withoutBids` = encerrados com `bid_count = 0`.
- Cancelamento: `findOne` com `lock: pessimistic_write` por `id`, `auctioneerId` e `cancelledAt IS NULL` dentro de `dataSource.transaction`; nulo → 404 (inexistente, de outro leiloeiro ou já cancelado). Depois do lock, regra pura `assertCancellable` em `lot.rules.ts`: encerrado (`now >= ends_at`) → 422 `LOT_ENDED` (checado primeiro); `bid_count > 0` → 409 `LOT_HAS_BIDS`. Senão grava `cancelled_at = now`. Resposta 204 sem corpo.
- "Tem lance" sai do `bid_count` da linha travada por enquanto (decisão do usuário); a 4.3 troca por `EXISTS` em `bids` (`deferred-work.md`), porque `bid_count` é só cache de exibição.
- `:id` pelo `LotIdPipe` (D-052).
- Novos códigos: `LOT_HAS_BIDS` (409), `LOT_ENDED` (422) no `DomainCode` e no filter.
- Queries fixas: livro 2 (itens + contagens), resumo 1, cancelamento 2 (lock + update).
- Respostas como classes `*.dto.ts`; tipos espelhados em `web/src/shared/api/types.ts`.

**Never:** total recebido, resultado ou link do comprovante (épico 5); tela (3.5); estorno; editar lote; carregar `lot_images`; chamar a Cleveland; dependência nova.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Livro | lotes próprios nos 4 status + lote de outro leiloeiro | só os próprios, `number DESC`, `counts` sem o alheio | N/A |
| Filtro inválido | `status=foo`, `page=0` | 400 | `VALIDATION_FAILED` |
| Papel | licitante / sem token | 403 / 401 | `ROLE_NOT_ALLOWED` |
| Resumo vazio | leiloeiro sem lotes | contagens 0, `currentBidTotal` 0, `nextStartsAt` nulo | N/A |
| Cancelar | próprio, agendado ou ao vivo, sem lance | 204, some da vitrine e vira `cancelled` no livro | N/A |
| Com lance | `bid_count > 0` | 409, lote não muda | `LOT_HAS_BIDS` |
| Encerrado | `now >= ends_at` | 422 | `LOT_ENDED` |
| Alheio / já cancelado / inexistente / `abc` | — | 404 | sem código |

**Casos de teste (aprovados pelo usuário):** `lot.rules.spec.ts` (`assertCancellable`): (1) aceita lote agendado sem lances; (2) aceita lote ao vivo sem lances; (3) recusa lote com lance com `LOT_HAS_BIDS`; (4) recusa lote encerrado com `LOT_ENDED`; (5) lote encerrado com lance recusa com `LOT_ENDED`. `lots.service.spec.ts` (`LotsService.cancel`, manager falso): (6) responde 404 quando o lote não é do leiloeiro, travando com `pessimistic_write` e filtrando por `auctioneerId`; (7) não grava `cancelled_at` quando o lote tem lance; (10) cancela lote agendado sem lances e grava `cancelled_at` com o `now` do `Clock`. `dashboard-query.dto.spec.ts`: (8) recusa status fora da lista. `dashboard.service.spec.ts` (`DashboardService.summary`): (9) leiloeiro sem lotes recebe zeros e próximo início nulo.

</frozen-after-approval>
## Code Map

- `api/src/lots/lots.service.ts` -- `STATUS_SQL`, `STATUS_WHERE` (linhas ~40-50), `visible()`; padrão de `list`/`counts` com `getRawAndEntities` e `COUNT(*) FILTER (...)::int`. Mover `STATUS_SQL`/`STATUS_WHERE` para `lots/lot-status.ts` (commit `refactor` separado) para o `DashboardService` reusar. Adicionar `cancel(auctioneerId, id)`.
- `api/src/lots/lots.controller.ts` -- adicionar `POST :id/cancel` com `@Auth('AUCTIONEER')`, `@HttpCode(204)`, `@CurrentUser()`, `LotIdPipe`.
- `api/src/lots/dashboard.controller.ts` (novo) -- `@Controller('dashboard')`, `@Auth('AUCTIONEER')` na classe (o `RolesGuard` lê handler e classe); `GET lots`, `GET summary`.
- `api/src/lots/dashboard.service.ts` (novo) -- `book(auctioneerId, query)`, `summary(auctioneerId)`; repository injetado de `Lot`. Soma de `current_bid` volta como `bigint` (string do driver): `Number()` na saída (seguro até 2^53).
- `api/src/lots/lots.module.ts` -- registrar controller e service novos.
- `api/src/lots/lot.rules.ts` + spec -- `assertCancellable({ endsAt, bidCount }, now)`, no estilo de `assertAvailable`.
- `api/src/common/domain.exception.ts`, `domain-exception.filter.ts` -- códigos novos.
- `api/src/lots/dto/` -- `dashboard-query.dto.ts` (modelo: `list-lots-query.dto.ts`), `dashboard-lot.dto.ts` (+ `toDashboardLot`, modelo: `lot-card.dto.ts`), `dashboard-book.dto.ts`, `dashboard-summary.dto.ts`.
- `api/src/lots/lots.service.spec.ts` -- construtor do service com `dataSource` falso (`transaction: (fn) => fn(manager)`).
- `web/src/shared/api/types.ts` -- `BookStatus`, `DashboardLot`, `DashboardBook`, `DashboardSummary`.
- Não mexer: `LotsService.list/featured/find` além do import das constantes movidas.

## Tasks & Acceptance

**Execution:**
- [x] `docs/stories/sprint-status.yaml` -- 3.3 done (feito), 3.4 in-progress.
- [x] `api/src/lots/lot-status.ts`, `lots.service.ts` -- mover constantes (commit `refactor`).
- [x] `common/domain.exception.ts`, `domain-exception.filter.ts`, `lots/lot.rules.ts` + spec -- códigos e `assertCancellable`.
- [x] `lots.service.ts` + spec, `lots.controller.ts` -- cancelamento.
- [x] `lots/dto/*`, `dashboard.service.ts` + spec, `dashboard.controller.ts`, `lots.module.ts` -- livro e resumo.
- [x] `web/src/shared/api/types.ts` -- tipos novos.
- [x] `README.md` (Testes; Comportamentos esperados: cancelamento só sem lances), `docs/ai-log.md`.

**Acceptance Criteria:**
- Given as rotas do painel e o cancelamento, when se olha o log de queries, then cada uma dispara o número fixo acima e nenhuma toca `lot_images` nem a Cleveland.
- Given um lote cancelado, when se chama `GET /lots`, `/lots/featured` e `/lots/:id`, then ele não aparece (404 no detalhe).

## Verification

**Commands:**
- `cd api && npm run lint:check && npm test -- --silent && npm run build` -- expected: verde.
- `cd web && npm run lint && npm run build` -- expected: verde.

**Manual checks:**
- Com compose: dois leiloeiros e um licitante; `curl` no livro (cada filtro), resumo, cancelar (204, 404 alheio, 404 de novo, 422 encerrado via `UPDATE` de `bid_count`/datas num banco de rascunho), conferindo as queries com `log_statement=all`.

## Implementation Notes

- Commits: `e860743` (refactor do `lot-status.ts`), `1ad5fc2` (cancelamento), `126d264` (livro, resumo e tipos do front).
- Teste extra fora dos casos aprovados: as linhas `LOT_HAS_BIDS` 409 e `LOT_ENDED` 422 no `it.each` já existente de `domain-exception.filter.spec.ts`.
- Linhas da matriz sem teste automático (livro só com os próprios e `number DESC`, papel, cancelar alheio/já cancelado/`abc`): conferidas à mão com curl num banco de rascunho (`agora_scratch34`, `log_statement=all`). Queries: livro 2, resumo 1, cancelamento 2 (`SELECT ... FOR UPDATE` + `UPDATE`). O e2e entra na 4.4.
- O caso (9) usa query builder falso; o SQL do resumo foi conferido só à mão.
- Banco `agora_scratch34` apagado a pedido do usuário; o `log_statement=all` era só desse banco (`ALTER DATABASE`), então saiu junto.

## Spec Change Log

## Review Triage Log

| # | Achado (edge-case-hunter) | Veredito | Evidência / rota |
|---|---|---|---|
| 1 | itens e `counts` do livro em duas queries podem divergir se um lote é criado ou cancelado entre elas | low | real só numa janela de milissegundos (READ COMMITTED) e o próximo GET corrige; a correção exige transação REPEATABLE READ. Rejeitado: mesmo comportamento já aceito pelo usuário na vitrine da 3.3 |
