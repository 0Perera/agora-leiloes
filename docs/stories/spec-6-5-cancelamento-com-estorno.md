---
title: 'Cancelamento com estorno'
type: 'feature'
created: '2026-10-28'
status: 'done'
baseline_commit: '5b23cc71a433402898d4ba5d278075b7edd888af'
route: 'dispatch'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** hoje o leiloeiro só cancela lote sem lances (`LOT_HAS_BIDS`). Uma peça com lances não sai da vitrine, e o saldo de quem lidera fica preso até o fim do lote.

**Approach:** o cancelamento passa a aceitar lote ao vivo com lances. Na mesma transação, trava o lote e depois a carteira do líder (ordem da D-014), libera o comprometido dele e grava `cancelled_at`. Os lances e a cadeia ficam como estão. Depois do commit sai o evento SSE `cancelled`, e sala, painel, carteira, Meus lances e auditoria refletem o cancelamento.

## Boundaries & Constraints

**Always:**
- Agendado ou ao vivo: cancela. Encerrado ou liquidado: `LOT_ENDED` (o instante exato do fim já conta como encerrado).
- O estorno é o valor do último lance da cadeia, devolvido a quem o deu. Só o líder tem comprometido, porque cada lance libera o comprometido do anterior. `balance` não muda.
- A regra fica numa função pura em `lot.rules.ts` (TDD, commit `test` vermelho antes, D-055).
- O evento sai só depois do commit, com payload público `{ cancelledAt }`.
- O código `LOT_HAS_BIDS` deixa de existir: sai do back, do front e do `CLAUDE.md`.
- Uma entrada nova no `decisions.md` com "Substitui D-018 (parte do estorno)". A D-018 recebe só a marcação de status.

**Never:**
- `UPDATE` ou `DELETE` em `bids`, ou mexer no selo do lote.
- Cancelar lote encerrado ou liquidado, ou desfazer comprovante.
- Aba nova em Meus lances. Mudar `GET /lots/:id`: o lote cancelado continua dando 404 (sala recarregada mostra "lote não encontrado", como hoje).

**Decisões do usuário:**
- Meus lances: o lote cancelado sai de "Em andamento" e vai para "Não arrematados", com o selo "Cancelado", "Seu maior lance" e "Cancelado em". Tem só "Auditar lote", sem "Abrir sala".
- Auditoria: o lote cancelado continua acessível pelo link direto, com o selo "Cancelado" e o veredito normal. A busca por número continua dando 404.
- Selo divergente: o cancelamento confere o selo e recusa com `LOT_INTEGRITY_FAILED`, como o lance e a liquidação.

## I/O & Edge-Case Matrix

| Cenário | Estado | Resultado |
|---|---|---|
| Agendado sem lances | `now < startsAt` | 204, sem estorno |
| Ao vivo sem lances | ao vivo, 0 lances | 204, sem estorno |
| Ao vivo com lances | líder L com lance de R$ X | 204, `committed` de L cai R$ X, `balance` igual |
| Encerrado | `now >= endsAt` (com ou sem lances, liquidado ou não) | 422 `LOT_ENDED`, nada muda |
| Lance chega junto | lance e cancelamento disputam o lock do lote | quem trava primeiro vence. Lance depois do cancelamento dá 404; cancelamento depois do lance estorna o novo líder |

</frozen-after-approval>

## Code Map

- `api/src/lots/lot.rules.ts` -- `assertCancellable` / `CancelState`: vira `cancellation({ endsAt, last }, now) → { release: Movement | null }`. `Movement` vem de `bids/bid.rules.ts`.
- `api/src/lots/lots.service.ts:225` -- `cancel()`: já trava o lote. Ler o último lance e travar a carteira com `lockWallets` (`wallets/wallet.lock.ts`) depois do lote, liberar e emitir o evento depois da transação. Copiar o padrão de `lastBid`/`move` de `bids/bids.service.ts` sem importar funções privadas (extrair só se for repetir).
- `api/src/lots/lot-events.service.ts` -- adiciona `cancelled(lotId, dto)` no padrão de `settled()`. Novo `dto/cancelled-event.dto.ts` com lista fechada, como `settled-event.dto.ts`. A 6.2 renomeia `publish` para `bid`: não renomear aqui.
- `api/src/common/domain.exception.ts`, `domain-exception.filter.ts` -- remove `LOT_HAS_BIDS`.
- `api/src/bids/my-bids.service.ts` -- `SECTION_WHERE`: `ongoing` exclui cancelado. `lost` inclui `lot.cancelledAt IS NOT NULL`. `lost` seleciona `cancelledAt` e ordena por `COALESCE(settledAt, cancelledAt) DESC`.
- `api/src/bids/dto/my-bids.dto.ts` -- `LostBid` com `settledAt: Date | null` e `cancelledAt: Date | null`.
- `api/src/wallets/wallets.service.ts:34` -- `committedLots` acrescenta `lot.cancelledAt IS NULL`.
- `api/src/audit/audit.service.ts:98` -- tira o filtro de cancelado. Status `CASE WHEN cancelledAt IS NOT NULL THEN 'cancelled' ELSE STATUS_SQL` (como `BOOK_SQL` em `dashboard.service.ts:20`). `audit/dto/audit-response.dto.ts`: `status` aceita `'cancelled'`.
- `api/test/audit.e2e-spec.ts:201` -- o teste "responde 404 para lote cancelado" é invertido. O de `/lots/number` (233) fica.
- `web/src/shared/api/client.ts:200` -- `openLotStream` ganha `onCancelled`. `shared/lib/use-lot-stream.ts` repassa.
- `web/src/features/live-room/use-room.ts`, `room-view.tsx` -- `ReadyRoom.cancelled`: para o stream, esconde o `BidForm`, mostra o selo "Cancelado" e a mensagem. O líder é quem tem `bids[0].alias === lot.me?.alias`, como em `shared/lib/live-bids.ts:73`. Para o líder, atualiza a carteira (`features/wallet/use-wallet-refresh.ts`).
- `web/src/features/auctioneer/ledger-row.tsx:166` -- `cancellable` sem `bidCount === 0`. Texto da confirmação conforme `bidCount`. `lot-errors.ts:75`: remove `LOT_HAS_BIDS`.
- `web/src/features/my-bids/lost.tsx`, `web/src/features/audit/audit-page.tsx:23`, `web/src/shared/api/types.ts` -- selo "Cancelado" e tipos.

## Tasks & Acceptance

**Execution:**
- [x] `api/src/lots/lot.rules.spec.ts` -- casos T1–T4 (commit `test` vermelho) -- D-055
- [x] `api/src/lots/lot.rules.ts` -- `cancellation()` -- regra pura
- [x] `api/src/lots/lots.service.ts`, `lot-events.service.ts` (+ spec do evento), `dto/cancelled-event.dto.ts`, exceção e filtro -- transação com estorno, evento depois do commit
- [x] `api/src/bids/my-bids.service.ts`, `wallets/wallets.service.ts`, `audit/audit.service.ts` + DTOs -- cancelado fora de "Em andamento" e do comprometido, auditoria acessível
- [x] `api/test/lots.e2e-spec.ts`, `audit.e2e-spec.ts`, `my-bids`/`wallet` e2e -- E1–E9
- [x] `web/src/...` (Code Map) + specs F1–F3 -- sala, painel, Meus lances, auditoria
- [x] `docs/decisions.md`, `CLAUDE.md`, `README.md` (comportamento e fora do escopo, se citarem), `docs/ai-log.md`, `sprint-status.yaml`

**Casos de teste (para aprovar):**
- T1 `describe('cancellation')`: `aceita lote agendado sem estorno`
- T2 `aceita lote ao vivo sem lances sem estorno`
- T3 `libera o comprometido do líder em lote ao vivo com lances`
- T4 `recusa lote encerrado com lance com LOT_ENDED` (os dois casos de `LOT_ENDED` já existentes continuam)
- E1 `cancela lote ao vivo com lances e devolve o comprometido do líder` (saldo igual, 204)
- E2 `lote cancelado com lances continua com auditoria intact e status cancelled`
- E3 `lote cancelado sai de ongoing e entra em lost em GET /my-bids`
- E4 `lote cancelado sai dos lotes comprometidos de GET /wallet`
- E5 `recusa cancelamento de lote com selo divergente com LOT_INTEGRITY_FAILED`
- E6 depois do fim original, a liquidação não age no lote cancelado: nada debitado do líder, nada creditado ao leiloeiro, nenhum comprovante
- E7 lance depois do cancelamento é recusado (404) e não grava nada em `bids` nem nas carteiras
- E8 em Meus lances, o lote cancelado nunca aparece em "Arrematados", mesmo depois do fim original, para nenhum dos licitantes
- E9 no painel, o livro mostra o lote como cancelado (sem "arrematado por") e o total recebido não muda
- S1 `LotEventsService.cancelled`: `emite o evento cancelled para os inscritos do lote`
- F1 mensagem da sala: líder recebe "Lote cancelado pelo leiloeiro. Seu saldo comprometido foi devolvido."; demais (e visitante) "Lote cancelado pelo leiloeiro."
- F2 painel: lote ao vivo com lances é cancelável; encerrado não
- F3 `cancelError` sem o caso `LOT_HAS_BIDS` (o teste atual sai)

**Acceptance Criteria:**
- Given uma sala aberta, when o leiloeiro cancela, then o evento chega depois do commit, o formulário some e a mensagem certa aparece.
- Given o painel com um lote ao vivo com lances, when o leiloeiro clica em "Cancelar lote", then a confirmação diz "Os lances serão cancelados e o saldo comprometido volta para o licitante que está ganhando."
- Given o líder estornado, when abre a carteira, then o lote não está entre os comprometidos e o comprometido caiu o valor do lance.

## Implementation Notes

- `cancellation()` roda antes da checagem do selo: lote encerrado responde `LOT_ENDED` mesmo com selo divergente, como a liquidação.
- T4 é um terceiro caso de `LOT_ENDED` (fim no instante exato, com lance); os dois casos existentes continuam.
- `lots.service.spec.ts`: os dois testes de `LOT_HAS_BIDS` saíram e o de ordem do lock passou a conferir a leitura do último lance.
- Testes além da lista: e2e de `LOT_ENDED` sem mudar nada e do evento `cancelled` no stream depois do commit (critério de aceite).
- `cancelError` ganhou a tradução de `LOT_INTEGRITY_FAILED` (sem teste próprio), para a recusa não cair na mensagem de conexão.
- O destaque da página inicial trata o evento `cancelled` como lote sumido (volta para "nenhum destaque"), porque o handler do stream ficou obrigatório.

## Spec Change Log

## Review Triage Log

| # | Achado | Veredito | Rota | Evidência |
|---|---|---|---|---|
| 1 | Contagem regressiva continua depois do cancelamento | medium | patch | `RoomSummary` não recebe `cancelled`; `secondsLeft` segue até o `endsAt` original |
| 2 | POST de lance em voo volta 404 e troca a sala cancelada por "não encontrado" | low | patch | `bid-form.tsx:53` chama `onMissing`, que sobrescreve `cancelled`; correção é um guard no `missing` |
| 3 | E1 não distingue "subtrair o lance" de "zerar o comprometido" nem confere perdedor e leiloeiro | medium | patch | só a carteira de `second`, que lidera um lote só |
| 4 | Nada garante que cancelamento recusado não emite `cancelled` | medium | patch | mock `events` sem asserção em `lots.service.spec.ts` |
| 5 | `cancelWarning` sem teste e spec de `cancellable` sem bidCount nem agendado | low | patch | F2 é critério de aceite |
| 6 | ai-log descreve a ordem errada (selo é conferido antes do estorno) | low | patch | `revoke` confere o selo antes de `refund` |
| 7 | Reconexão depois de evento perdido mostra "não encontrado" | low | reject | aceito no bloco congelado: `GET /lots/:id` continua 404 |
| 8 | Aviso some se lances chegam depois do painel carregar | low | reject | cancelamento continua correto; só o texto do aviso depende do bidCount carregado |
| 9 | `refund` sem guard para comprometido menor que o lance | false | reject | invariante do motor: o líder sempre tem o último lance comprometido; CHECK do banco é a última defesa |
| 10 | Texto da confirmação diz "lances serão cancelados", mas ficam na cadeia | low | reject | texto definido pelo usuário; levado a ele |
| 11 | `CLAUDE.md` com "cancelar sem lances" e exemplo do estorno fora do escopo | low | defer | arquivo de contexto do agente: decisão do usuário |
| 12 | Timer não é recalculado no cancelamento | low | reject | liquidação pula cancelado e recalcula; regra do CLAUDE.md cita lance e prorrogação |
| 13 | T1 e T2 iguais nos dados; nomes dos três `LOT_ENDED` parecidos | low | reject | estilo |
| 14 | `AUDIT_STATUS_SQL` duplica `BOOK_SQL`; `BookStatus` importado do DTO do painel | low | reject | estilo |
| 15 | `CancelledEvent` declarado e não usado no front | low | reject | estilo |
| 16 | Destaque some em vez de pular para o próximo | low | reject | raro; recarregar resolve |
| 17 | Ordem `COALESCE` de lost sem teste | low | reject | teste opcional |
| 18 | `LOT_ENDED` antes do selo sem teste | low | reject | teste opcional |
| 19 | `walletKey` sem teste | low | reject | teste opcional; hook sem teste no front |
| 20 | `epics.md` ainda cita `LOT_HAS_BIDS` | low | reject | doc de planejamento, histórico |

## Verification

**Commands:**
- `cd api && npm run lint:check && npm test && npm run test:e2e && npm run build` -- tudo verde
- `cd web && npm run lint:check && npm test && npm run build` -- tudo verde

**Manual checks:**
- Sala, painel, Meus lances e auditoria em 360, 768, 1024 e 1280px (o usuário confere)
