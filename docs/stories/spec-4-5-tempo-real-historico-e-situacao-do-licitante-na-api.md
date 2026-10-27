---
title: 'Tempo real, histórico e situação do licitante na API'
type: 'feature'
created: '2026-10-27'
status: 'done'
baseline_commit: '0f548836daecdc2b241bd192a261b388b44fc55b'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/stories/epic-4-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** o lance existe (4.3), mas ninguém fica sabendo dele sem recarregar: não há stream, histórico, `me.alias` no detalhe nem a lista dos lotes que prendem o saldo do licitante.

**Approach:** `LotEventsService` em memória alimenta `GET /lots/:id/stream` (`@Sse`, público) com um evento por lance aceito, emitido depois da transação; `GET /lots/:id/bids?page=` traz o histórico em uma query; `GET /lots/:id` aceita token opcional e devolve `me.alias`; `GET /wallet` passa a listar os lotes comprometidos.

## Boundaries & Constraints

**Always:**
- Evento emitido em `BidsService.place` depois que `dataSource.transaction(...)` resolve, fora do callback. Recusa ou rollback não emite.
- Payload do evento e do item do histórico só com campos públicos (lista fechada no DTO); `user_id` só existe dentro da query, nunca na resposta.
- Ao desinscrever (conexão fechada), o ouvinte sai do mapa; lote sem ouvinte não ocupa entrada.
- Heartbeat SSE como comentário (`MessageEvent.comment`) a cada 25 s.
- `GET /lots/:id`: sem `Authorization` responde sem `me`; token inválido ou expirado responde 401 (mesmo `UnauthorizedException` do `AuthGuard`).
- Lotes comprometidos: lote em que o último lance (maior `seq`) é do licitante e `settled_at IS NULL`, ao vivo ou já encerrado. Uma query, sem N+1.
- Plano da query dos comprometidos conferido com `EXPLAIN` e `SET enable_seqscan = off`.
- Lote cancelado ou inexistente: 404 no stream e no histórico.
- Decisões do usuário: lista de comprometidos com teto de 20 lotes e `total`, sem `page`; evento traz também `createdAt`; `me` só para `BIDDER`; histórico com 20 por página em `ORDER BY seq DESC LIMIT 20 OFFSET n` (índice `(lot_id, seq)` de trás para frente, sem depender de `bid_count`, D-042); índice `bids_user_id` só se o `EXPLAIN` mostrar que é necessário, com a saída registrada na spec.

**Never:**
- Emitir dentro da transação; stream por usuário; token na query string.
- Ler liderança de `current_bid`; atualizar ou apagar `bids`.
- Mudar o motor da regra (`bid.rules.ts`) ou a cadeia.

## I/O & Edge-Case Matrix

| Cenário | Entrada / Estado | Resultado |
|---|---|---|
| Lance aceito com stream aberto | `POST /lots/:id/bids` 201 | evento `bid` com `{ seq, amount, alias, createdAt, endsAt }` |
| Lance recusado | 422 | nenhum evento |
| Stream de lote cancelado/inexistente | `GET /lots/:id/stream` | 404 |
| Conexão fechada | cliente aborta | `listeners(lotId)` volta a 0 |
| Detalhe com token de licitante | Bearer válido | `me: { alias }` igual ao alias dos lances dele |
| Detalhe com token de leiloeiro | Bearer válido | sem `me` (leiloeiro não dá lance) |
| Detalhe com token ruim | Bearer expirado/adulterado | 401 |
| Histórico | `?page=1`, 25 lances | 20 itens, `seq` 25..6, `total` 25 |
| Histórico além do fim | `?page=3`, 25 lances | 200, `items: []` |
| Carteira | lidera A (ao vivo) e B (encerrado, não liquidado), superado em C | `lots` com A e B, `total` 2; soma = `committed` |
| Carteira com mais de 20 | lidera 21 lotes | 20 itens, `total` 21 |

</frozen-after-approval>

## Casos de teste (aprovados)

- `LotEventsService`: entrega o evento só aos ouvintes do lote; remove o ouvinte ao desinscrever; manda heartbeat a cada 25 s.
- `BidsService.place`: emite depois que a transação termina; não emite em lance recusado; não emite quando a transação falha.
- `OptionalAuthGuard`: sem header passa sem usuário; token inválido dá 401; token válido define o usuário.
- DTOs do evento e do histórico: chaves exatas, sem `userId`, nome ou e-mail.
- e2e (`api/test/realtime.e2e-spec.ts`): stream recebe o lance aceito e não o recusado; fechar a conexão zera os ouvintes; histórico pagina do mais recente; `GET /lots/:id` com e sem token e com token ruim; `/wallet` lista ao vivo e encerrado não liquidado e não lista o lote em que foi superado.

## Code Map

- `api/src/bids/bids.service.ts` -- `place()`: guardar o resultado da transação e chamar `events.publish(lotId, ...)` depois; novo `history(lotId, page)`. `forLot(secret, userId, lotId)` de `audit/alias.ts` gera o alias.
- `api/src/bids/bids.controller.ts` -- `GET :id/bids` com `LotIdPipe` e DTO de query `page` (padrão de `list-lots-query.dto.ts`).
- `api/src/bids/bids.module.ts` -- importa `LotsModule` para o `LotEventsService`.
- `api/src/bids/bid.entity.ts` -- se o `EXPLAIN` pedir: `@Index('bids_user_id')` em `userId` e migration via `npm run migration:generate`.
- `api/src/lots/lot-events.service.ts` (novo) -- `Map<number, Set<Subscriber>>`; `publish`, `stream(lotId): Observable<MessageEvent>` (merge com `interval` do heartbeat), `listeners(lotId)`.
- `api/src/lots/lots.controller.ts` -- `@Sse(':id/stream')` async (checa o lote em 1 query, `exists` com `cancelledAt: IsNull()`), declarado antes de `':id'`; `find` com `@UseGuards(OptionalAuthGuard)` e `@CurrentUser()`.
- `api/src/lots/lots.service.ts` -- `find(id, viewer?)` acrescenta `me` só para `BIDDER`; sem query nova. `lots.module.ts` exporta `LotEventsService`.
- `api/src/lots/dto/lot-detail.dto.ts` -- `me?: LotViewerDto { alias }`.
- `api/src/common/auth.guard.ts` -- extrair a verificação para reaproveitar em `OptionalAuthGuard`; `current-user.decorator.ts` -- ajustar o comentário.
- `api/src/wallets/wallets.service.ts`, `wallets.module.ts`, `dto/wallet-response.dto.ts` -- `committedLots(userId)` com `Bid` + `Lot`; `lots: CommittedLotDto[] { id, number, title, amount }` (até 20, `lot.endsAt ASC`) e `lotsTotal` via `COUNT(*) OVER()`, na mesma query.
- `api/test/app.ts` -- helper `stream(lotId)` com `fetch` na porta do `app.listen(0)` e `AbortController`.
- `web/src/shared/api/types.ts` -- `Wallet.lots`, `LotDetail.me?`, `BidEvent`, `BidHistory`.
- Não mexer: `bid.rules.ts`, `audit/chain.ts`, fluxo de lock do `place`.

## Tasks & Acceptance

**Execution:**
- [x] `docs/stories/sprint-status.yaml` -- 4-4 `done` (feito), 4-5 `in-progress`
- [x] `api/src/lots/lot-events.service.ts` + spec -- stream em memória
- [x] `api/src/bids/*` -- emissão depois do commit, histórico; índice e migration só se o `EXPLAIN` pedir
- [x] `api/src/common/auth.guard.ts` + spec, `api/src/lots/*` -- `OptionalAuthGuard`, `me`, rota `@Sse`
- [x] `api/src/wallets/*` -- lotes comprometidos
- [x] `api/test/app.ts`, `api/test/realtime.e2e-spec.ts` -- casos e2e
- [x] `web/src/shared/api/types.ts`, `README.md` (comportamento do stream), `docs/ai-log.md`, decisões se houver

**Acceptance Criteria:**
- Given o Postgres local, when `EXPLAIN` da query dos comprometidos com `enable_seqscan = off`, then o plano usa índice para filtrar por `user_id` (com índice novo, se preciso), e a saída fica nas Implementation Notes.
- Given o log de queries ligado, when cada rota tocada roda, then: detalhe 1, histórico 1, stream 1 ao abrir, carteira 2.
- Given Docker, when `npm run test:e2e`, then as suítes da 4.4 e a nova passam.

## Design Notes

Histórico em uma query e com 404 correto: parte de `lots` e junta a página por `LEFT JOIN LATERAL` (SQL parametrizado com `dataSource.query`, já que o QueryBuilder não tem lateral):

```sql
SELECT bid.seq, bid.user_id, bid.amount, bid.created_at,
  (SELECT COUNT(*) FROM bids WHERE lot_id = lot.id)::int AS total
FROM lots lot LEFT JOIN LATERAL (
  SELECT seq, user_id, amount, created_at FROM bids WHERE lot_id = lot.id
  ORDER BY seq DESC LIMIT 20 OFFSET $2) bid ON true
WHERE lot.id = $1 AND lot.cancelled_at IS NULL ORDER BY bid.seq DESC
```

Nenhuma linha → 404; uma linha com `seq` nulo → página vazia. Resposta `{ items, page, pageSize, total }`, como o livro do painel.

Lotes comprometidos: `bids` do usuário com `NOT EXISTS` de lance posterior no mesmo lote (índice `(lot_id, seq)`) e `JOIN lots` com `settled_at IS NULL`, `LIMIT 20`.

## Verification

**Commands:**
- `cd api && npm run lint:check && npm test --silent && npm run build` -- expected: verde
- `cd api && npm run test:e2e` -- expected: todas as suítes verdes
- `cd web && npm run lint:check && npm run build` -- expected: verde

## Implementation Notes

**EXPLAIN dos comprometidos** (Postgres local, `SET enable_seqscan = off`), antes do índice: `user_id` só como `Filter`, varrendo todo lote não liquidado por `lots_ends_at`.

```
 Limit
   ->  Incremental Sort
         Sort Key: lot.ends_at, lot.id
         ->  WindowAgg
               ->  Nested Loop Anti Join
                     ->  Nested Loop
                           ->  Index Scan using lots_ends_at on lots lot
                                 Filter: (settled_at IS NULL)
                           ->  Index Scan using bids_lot_seq on bids bid
                                 Index Cond: (lot_id = lot.id)
                                 Filter: (user_id = 1)
                     ->  Index Only Scan using bids_lot_seq on bids later
                           Index Cond: ((lot_id = bid.lot_id) AND (seq > bid.seq))
```

Depois do índice `bids_user_id` (migration `1793123206690-BidsUserId`):

```
 Limit
   ->  Sort
         Sort Key: lot.ends_at, lot.id
         ->  WindowAgg
               ->  Nested Loop Anti Join
                     ->  Nested Loop
                           ->  Index Scan using bids_user_id on bids bid
                                 Index Cond: (user_id = 1)
                           ->  Index Scan using "PK_2bb990a4015865cb1daa1d22fd9" on lots lot
                                 Index Cond: (id = bid.lot_id)
                                 Filter: (settled_at IS NULL)
                     ->  Index Only Scan using bids_lot_seq on bids later
                           Index Cond: ((lot_id = bid.lot_id) AND (seq > bid.seq))
```

**EXPLAIN do histórico:** `Index Scan Backward using bids_lot_seq` dentro do `LATERAL` com `Limit`; o `total` é um `Index Only Scan` no mesmo índice.

**Queries por rota** (log do TypeORM numa execução e2e): detalhe 1, histórico 1, stream 1 ao abrir (`EXISTS` em `lots`), carteira 2.

**Fora do Code Map:** o depósito continua devolvendo só o saldo, então o front ganhou `WalletBalance` (resposta do depósito) e o `update` do `WalletProvider` mescla o saldo novo na carteira já carregada, mantendo `lots`. O e2e da 4.4 que conferia `GET /wallet` com `toEqual` passou a `toMatchObject`.

**Testes além da lista aprovada**, tirados da matriz: "stream de lote inexistente responde 404", "histórico além do fim responde página vazia" e "carteira mostra até 20 lotes e o total de todos".

## Review Triage Log

| # | Achado | Veredito | Evidência |
|---|---|---|---|
| 1 | `events.publish` lançando depois do commit devolveria 500 e cortaria o `forEach` (edge) | false | o `subscriber.next` entra no pipe do Nest (`map`/`JSON.stringify` de objeto simples); o RxJS 7 captura erro de operador e entrega no `error` daquele inscrito, sem lançar para o `publish` |
| 2 | `GET /wallet` lê saldo e lotes em paralelo, fora de transação; um lance entre as duas leituras desalinha `committed` e a lista (edge) | low | real, só na janela entre as duas leituras, e some no próximo `GET /wallet` (o front refaz a cada mudança de status); a correção pede transação ou query única; rejeitado e listado |
| 3 | Stream de lote cancelado ou liquidado continua aberto com heartbeat (edge) | low | cancelar só vale sem lances; a 4.6 pode fechar o stream ao encerrar e a liquidação (épico 5) pode emitir o evento final; rejeitado e listado |
| 4 | Stream público sem limite de conexões por lote (edge) | low | proteção contra abuso fora do escopo (instância única documentada); rejeitado e listado |
