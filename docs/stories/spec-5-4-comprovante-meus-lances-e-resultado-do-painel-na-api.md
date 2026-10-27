---
title: 'Comprovante, meus lances e resultado do painel na API'
type: 'feature'
created: '2026-10-27'
status: 'done'
baseline_commit: 'ddc4644d9f37ae2d5a78075afeb938ef8856dab1'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/stories/epic-5-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** a liquidação (5.2) já grava o comprovante assinado, mas ninguém consegue lê-lo: não há rota pública do comprovante, o licitante não vê os próprios lances e arremates, e o painel do leiloeiro não mostra o total recebido nem o resultado de cada lote encerrado.

**Approach:** três leituras novas, cada uma com número fixo de queries: `GET /receipts/:token` (público, assinatura conferida a cada consulta), `GET /my-bids?section=ongoing|won|lost&page=` (licitante) e o resultado no painel (`received` no `GET /dashboard/summary`, `result` por lote no `GET /dashboard/lots`). Só leitura: sem migration e sem gatilho de liquidação novo.

## Boundaries & Constraints

**Always:**
- Arrematado e não arrematado se distinguem por `receipts.winner_user_id` comparado no SQL, nunca pelo alias (dois licitantes podem colidir no alias).
- Seções particionam os lotes em que o licitante deu lance: `settled_at` nulo → `ongoing` (inclusive encerrado e não liquidado, com `awaitingSettlement: true`, e o travado pela D-064); liquidado e vencedor = ele → `won`; liquidado e vencedor `IS DISTINCT FROM` ele → `lost`. Nenhum lote some.
- Situação em `ongoing` (`winning` | `outbid`) vem do `user_id` do último lance (maior `seq`) do lote, calculada no SQL; nunca de `current_bid` nem do alias.
- `GET /receipts/:token` sempre devolve o comprovante encontrado, com `valid` = `verify()` da 5.2 sobre os campos lidos nessa requisição; adulterado sai com `valid: false` e os dados como estão no banco.
- Token fora de `^[A-Za-z0-9_-]{43}$` responde 404 num pipe, sem tocar o banco (como o `LotIdPipe`, D-052). Token bem formado e inexistente também 404.
- Nenhuma resposta traz `user_id`, `winner_user_id`, nome ou e-mail.
- Rotas: `/receipts/:token` sem guard; `/my-bids` com `@Auth('BIDDER')`; painel continua `@Auth('AUCTIONEER')`, só os próprios lotes.
- Respostas como classes `*.dto.ts`; `web/src/shared/api/types.ts` atualizado na mesma PR.

**Never:** migration, liquidar a partir de `/my-bids` ou do painel, query dentro de loop, alias como critério de vencedor, mudar `LotsService.find` ou a liquidação.

## I/O & Edge-Case Matrix

| Cenário | Estado | Resposta |
|---|---|---|
| Comprovante íntegro | token existente | 200, `valid: true` |
| Comprovante adulterado | `UPDATE receipts SET amount` no banco | 200, valor alterado e `valid: false` |
| Token malformado | 42/44 caracteres, `+`, `/`, `=` | 404, nenhuma query |
| Token inexistente | 43 caracteres válidos | 404 |
| Ao vivo, meu lance é o último | `ongoing` | `situation: 'winning'`, `awaitingSettlement: false` |
| Ao vivo, rival cobriu | `ongoing` | `situation: 'outbid'` |
| Encerrado sem liquidar | relógio após `ends_at`, sem `GET /lots/:id` | em `ongoing`, `awaitingSettlement: true` |
| Liquidado, eu venci | `won` | valor, `settledAt`, `receiptToken` |
| Liquidado, perdi | `lost` | valor final e o meu maior lance |
| Leiloeiro / anônimo em `/my-bids` | — | 403 `ROLE_NOT_ALLOWED` / 401 |
| Painel, encerrado com lances liquidado | `book` | `result: { alias, amount, receiptToken }` |
| Painel, encerrado sem lances liquidado | `book` | `result: { alias: null, amount: null, receiptToken: null }` |
| Painel, não liquidado (ao vivo, agendado, cancelado, aguardando) | `book` | `result: null` |
| Total recebido | comprovantes dos meus lotes e de outro leiloeiro | `received` soma só os meus |

</frozen-after-approval>

## Code Map

- `api/src/receipts/receipt.entity.ts`, `receipt.signature.ts` -- reaproveitar `verify(secret, fields, signature)`; segredo `BID_HMAC_SECRET` via `ConfigService`, como em `SettlementService`.
- `api/src/settlement/settlement.service.ts:110` -- token = `randomBytes(32).toString('base64url')` (43 caracteres): base da regex do pipe.
- `api/src/lots/lot-id.pipe.ts` -- modelo do `ReceiptTokenPipe`.
- `api/src/lots/dashboard.service.ts` -- `summary` (1 query agregada sobre `lots`) e `book` (itens + `counts`, 2 queries). `leftJoin(Receipt, 'receipt', 'receipt.lotId = lot.id')` não duplica linhas (`UNIQUE (lot_id)`). `SUM` volta string: `Number()`, como `currentBidTotal`.
- `api/src/lots/dto/dashboard-lot.dto.ts`, `dashboard-summary.dto.ts` -- ganham `result` e `received`.
- `api/src/lots/lots.service.ts` -- padrão `getRawAndEntities` com campos de `receipt` em `addSelect`; `HAS_BID_SQL` mostra o filtro por `bid.user_id`.
- `api/src/wallets/wallets.service.ts` -- `committedLots`: padrão do "último lance" (`NOT EXISTS later.seq > bid.seq`).
- `api/src/lots/dto/dashboard-query.dto.ts` -- modelo do `MyBidsQueryDto` (`@IsIn`, `page` 1..100).
- `api/test/app.ts`, `api/test/settlement.e2e-spec.ts` -- `start()`, `reset()`, `createLot`, `bid`, `clock.set`, `SettlementService.settle` direto para liquidar sem passar pelo GET.
- Não mexer: `LotsService.find`, `SettlementService`, `settlement.rules.ts`, entidades e migrations.

## Tasks & Acceptance

**Execution:**
- [x] `api/src/receipts/receipt-token.pipe.ts` + `.spec.ts` -- regex de base64url com 43 caracteres, `NotFoundException` fora dela -- 404 sem banco
- [x] `api/src/receipts/receipts.service.ts`, `receipts.controller.ts`, `receipts.module.ts`, `dto/receipt-response.dto.ts` -- 1 query (`receipts` + `lots`): `lotId`, `number`, `title`, `artist`, `amount`, `alias`, `settledAt`, `finalHash`, `valid`; registrar em `app.module.ts` -- `lotId` serve à imagem e ao link da auditoria na 5.6
- [x] `api/src/bids/my-bids.controller.ts`, `my-bids.service.ts`, `dto/my-bids-query.dto.ts` (+ spec da validação), `dto/my-bids.dto.ts`; registrar em `bids.module.ts` -- 2 queries por chamada: itens da seção (página de 20) e `counts` das três seções; base = `bids` do licitante agrupados por lote (`MAX(amount)` = `myBid`, filtro pelo índice `bids_user_id`) com join em `lots` e left join em `receipts`; ordem `ongoing` por `endsAt ASC, id`, `won`/`lost` por `settledAt DESC, id DESC`
- [x] `api/src/lots/dashboard.service.ts` + DTOs + `dashboard.service.spec.ts` se quebrar -- `received` no `summary` (mesma query) e `result` no `book` (mesma query de itens)
- [x] `web/src/shared/api/types.ts` -- `Receipt`, `MyBids` (união por seção), `DashboardLot.result`, `DashboardSummary.received`
- [x] `api/test/my-bids.e2e-spec.ts`, `api/test/receipts.e2e-spec.ts` -- casos aprovados abaixo
- [x] `README.md` -- uma linha em "Comportamentos esperados": lote encerrado fica em "em andamento", aguardando liquidação, até ser liquidado
- [x] `docs/ai-log.md` -- entrada da 5.4

**Acceptance Criteria:**
- Given o Postgres local com `SET enable_seqscan = off`, when `EXPLAIN` das duas queries de `/my-bids`, then o filtro por licitante usa `bids_user_id`; saída registrada nas Implementation Notes.
- Given o log de queries ligado, when cada rota nova ou alterada é chamada, then dispara sempre o mesmo número (receipts 1, my-bids 2, summary 1, lots 2), registrado nas Implementation Notes.
- Given a suíte e2e, when roda, then fica verde sem handle aberto.

## Casos de teste (propostos pelo agente; aprovação pela instrução de seguir)

Unitário: (1) pipe aceita token de 43 caracteres base64url; (2) pipe recusa 42, 44 e caracteres `+`, `/`, `=`; (3) `section` fora da lista dá `VALIDATION_FAILED`.
E2e `my-bids`: (4) ao vivo com meu lance por último → `winning`; (5) rival cobriu → `outbid`; (6) encerrado não liquidado aparece em `ongoing` com `awaitingSettlement: true`; (7) vencedor vê o lote em `won` com valor, data e token, e não em `ongoing`; (8) perdedor vê em `lost` com valor final e o seu maior lance; (9) `counts` somam todos os lotes em que deu lance, e lote sem lance dele não aparece; (10) resposta sem `userId`, nome ou e-mail; (11) leiloeiro 403 e anônimo 401.
E2e `receipts`: (12) comprovante com os campos e `valid: true`; (13) `amount` alterado no banco → 200 com `valid: false`; (14) token bem formado inexistente → 404; (15) resposta sem dado pessoal; (16) `received` soma só os comprovantes dos lotes do leiloeiro; (17) `book` traz `result` com token no lote arrematado, nulos no sem lances e `null` no ao vivo.

## Design Notes

- **Partição pelo `settled_at`:** como lote com lance não pode ser cancelado (`LOT_HAS_BIDS`), `settled_at` nulo/preenchido mais o `winner_user_id` cobrem todos os casos; o `IS DISTINCT FROM` em `lost` garante que um liquidado sem comprovante (não deveria existir) ainda apareça.
- **`counts` por seção:** query à parte (como `book` e vitrine), porque `COUNT(*) OVER()` zera o total numa página além do fim.
- `/my-bids` não liquida: o timer (5.3) e o acesso à sala cobrem; a marca `awaitingSettlement` explica o intervalo.

## Verification

**Commands:**
- `cd api && npx jest src/receipts src/bids --silent` -- expected: verde
- `cd api && npm run lint:check && npm test && npm run build` -- expected: sem erro
- `cd api && npm run test:e2e` -- expected: verde
- `cd web && npm run lint:check && npm run build` -- expected: sem erro (só tipos)

## Implementation Notes

- `GET /receipts/:token` usa query builder com `getRawOne` (receipts + lots): o `findOne` com `relations` gerava a subquery de `distinctAlias` (2 queries e erro sem o `id` no select).
- `/my-bids`: itens agrupados por `lot.id, receipt.id` (`MAX(bid.amount)` = `myBid`), situação por subquery correlata no último lance (`bids_lot_seq`, backward); `counts` com `COUNT(DISTINCT lot.id) FILTER (...)` na mesma base. `items` é `MyBidDto[]` (união) na API; no front, `MyBids` é união discriminada por `section`.
- `lost.amount` é `number | null` (liquidado sem comprovante, que não deveria existir).
- `received` fica no topo de `DashboardSummaryDto`; `result` de `book` é `BookResultDto` (`alias`, `amount`, `receiptToken`).
- `dashboard.service.spec.ts`: o mock ganhou `leftJoin` e o caso sem lotes passou a esperar `received: 0`.

**Queries por chamada** (spy em `PostgresQueryRunner.query`, script fora do repo, Testcontainers Postgres 17):
- `GET /receipts/:token` 200: 1; token de 42 caracteres: 0 (404); 43 inexistente: 1 (404)
- `GET /my-bids?section=ongoing|won|lost`: 2 cada; `lost&page=50`: 2 (total preservado)
- `GET /dashboard/summary`: 1; `GET /dashboard/lots` e `?status=ended&page=9`: 2

**EXPLAIN com `SET enable_seqscan = off`** (mesmo Postgres):

Itens (`ongoing`):
```
Limit -> Result -> Sort (lot.ends_at, lot.id) -> GroupAggregate (lot.id, receipt.id) -> Sort
  -> Nested Loop Left Join
       -> Nested Loop
            -> Index Scan using bids_user_id on bids bid  Index Cond: (user_id = 2)
            -> Index Scan using PK_... on lots lot  Index Cond: (id = bid.lot_id)  Filter: (settled_at IS NULL)
       -> Index Scan using receipts_lot_id on receipts receipt  Index Cond: (lot_id = lot.id)
SubPlan 1 -> Limit -> Index Scan Backward using bids_lot_seq on bids last  Index Cond: (lot_id = lot.id)
```

Contagens:
```
Aggregate -> Sort (lot.id) -> Nested Loop Left Join
  -> Nested Loop
       -> Index Scan using bids_user_id on bids bid  Index Cond: (user_id = 2)
       -> Index Scan using PK_... on lots lot  Index Cond: (id = bid.lot_id)
  -> Index Scan using receipts_lot_id on receipts receipt  Index Cond: (lot_id = lot.id)
```

## Spec Change Log

## Review Triage Log

| Achado | Veredito | Evidência / destino |
|---|---|---|
| `page` com `@Max(100)` deixa inacessível o que passa de 2000 lotes numa seção | low | mesmo teto do painel e da vitrine; licitante com 2000 lotes não ocorre no desafio; rejeitado |
| Liquidação entre a query de itens e a de `counts` desalinha `total` dos itens | low | cosmético e momentâneo, mesmo padrão de `book` e da vitrine; corrigir pede transação à parte; rejeitado |
