---
title: 'Liquidação e comprovante assinado na API'
type: 'feature'
created: '2026-10-27'
status: 'done'
baseline_commit: '80f4a84412122219e0c8a459880095b5c38eafb2'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/stories/epic-5-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** lote vencido continua parado: ninguém é cobrado, o leiloeiro não recebe e não existe prova do arremate. A regra da 5.1 decide o que fazer, mas nada a executa.

**Approach:** `SettlementService.settle(lotId)` executa a regra numa transação (trava, confere o selo, move saldo, grava comprovante assinado, preenche `settled_at`) e emite o evento de encerramento depois do commit. O gatilho desta story é o `GET /lots/:id` de lote vencido; a resposta passa a trazer o resultado e, só para o vencedor, o token do comprovante.

## Boundaries & Constraints

**Always:**
- Travas na ordem do lance (D-014): `FOR UPDATE` no lote, depois as carteiras do vencedor e do leiloeiro numa query só, em ordem de `id`. Só o `manager` dentro da transação.
- `now` do `Clock`, lido depois do lock do lote; é o `settled_at` e entra na assinatura com `toISOString()` (D-056).
- Vencedor e valor do último lance de `bids`, nunca de `current_bid` (D-042), via `decide` da 5.1.
- Antes de mover saldo, recalcula o selo (`lot_id`, `seq` do último lance ou 0, hash dele ou `GENESIS`) e compara com `lots.seal` (D-059). Divergente ou nulo: não liquida, loga `warn` só com o id do lote e o motivo, nada é gravado.
- Lote sem lances: só `settled_at`; sem comprovante e sem movimento.
- Comprovante: `UNIQUE (lot_id)`, token `randomBytes(32).toString('base64url')` com `UNIQUE`, alias do vencedor, valor, hash final, `settled_at` e assinatura `receipt:` (`lot_id|alias|valor|hash final|data`, HMAC-SHA256 hex, `BID_HMAC_SECRET`).
- Idempotente (D-009): quem chega depois vê `settled_at` e termina sem erro; violação do `UNIQUE (lot_id)` também termina sem erro.
- Evento `settled` no stream só depois do commit, com `{ alias, amount }` (nulos em lote sem lances). Nunca `user_id`, nome ou e-mail.
- `GET /lots/:id` nunca cai pela liquidação: qualquer erro nela vira log (só id do lote e mensagem do driver, sem parâmetros) e a resposta sai normalmente.
- TDD da assinatura em dois pares `test` vermelho → `feat` (D-055). `npm run lint:check` antes de cada commit.

**Never:** timer (5.3); `GET /receipts/:token`, meus lances, painel (5.4); auditoria (5.5); telas (5.6+); `UPDATE`/`DELETE` em `bids`; dependência nova; casos de teste além dos listados.

## I/O & Edge-Case Matrix

Casos unitários aprovados (`receipt.signature.spec.ts`):

| # | describe | Caso |
|---|----------|------|
| 1 | `receiptSignature.sign` | gera a mesma assinatura para o mesmo comprovante |
| 2 | `receiptSignature.sign` | muda a assinatura quando muda o campo (`it.each`: `lotId`, alias, valor, hash final, data) |
| 3 | `receiptSignature.sign` | não coincide com um hash de lance de mesmo conteúdo |
| 6 | `receiptSignature.sign` | confere com um HMAC montado à mão (`receipt:`, campos na ordem, `\|`) |
| 4 | `receiptSignature.verify` | aceita comprovante intacto |
| 5 | `receiptSignature.verify` | recusa comprovante com qualquer campo alterado (`it.each`) |

E2e (`api/test/settlement.e2e-spec.ts`, Testcontainers da 4.4):

| Cenário | Estado | Esperado |
|---|---|---|
| Simultâneas (pedido) | lote vencido com lance, barreira no lote, dois `GET` | 2 esperando o lock; ambos 200; 1 comprovante; carteiras movidas uma vez |
| D-042 (pedido) | `current_bid` alterado no banco | vencedor debitado e leiloeiro creditado pelo último lance; comprovante com esse valor |
| Selo inválido (pedido) | último lance apagado no banco | `GET` 200; `settled_at` nulo; nenhum comprovante; carteiras intactas |
| Sem lances (extra, aviso) | lote vencido sem lances | `settled_at` preenchido; nenhum comprovante; nenhum movimento |
| Token (extra, aviso) | lote liquidado | vencedor recebe `result` e `me.receiptToken`; outro licitante só `result` |
| Evento (extra, aviso) | stream aberto, `GET` liquida | evento `settled` com só `alias` e `amount` |

</frozen-after-approval>

## Code Map

- `api/src/bids/bids.service.ts` -- modelo da transação: `lockLot`, `lastBid`, `seal()`, `lockWallets` (uma query, `ORDER BY id`), `walletOf`, evento depois do commit.
- `api/src/settlement/settlement.rules.ts` -- `decide({ lot, last, now })`; `moves` são variações por carteira (`balance`, `committed`). Não alterar.
- `api/src/audit/chain.ts` -- `sign(secret, 'receipt', fields)`, `sealLot`, `hashBid`, `GENESIS`. `audit/alias.ts` -- `forLot(secret, userId, lotId)`.
- `api/src/lots/lots.service.ts` `find()` -- uma query com `STATUS_SQL`/`HAS_BID_SQL`; acrescentar `lot.settledAt` e o `LEFT JOIN` em `receipts`.
- `api/src/lots/lot-events.service.ts` -- `publish` monta `{ type: 'bid' }`; ganha um método para `settled`. `lots.module.ts` exporta o service e `bids.module.ts` importa `LotsModule` só por ele.
- `api/src/lots/dto/lot-detail.dto.ts`, `dto/bid-event.dto.ts` -- classes de resposta e lista fechada do evento.
- `api/src/common/query-failed.filter.ts` -- como logar `QueryFailedError` sem parâmetros (`driverError.message`).
- `api/test/app.ts` -- `start`, `reset`, `createLot`, `bid`, `stream`, `lockLot`, `waitForLockWaiters`, `TestClock`; `concurrency.e2e-spec.ts` -- forma da corrida com barreira.
- `api/src/audit/chain.spec.ts` -- forma do caso do HMAC montado à mão.
- `web/src/shared/api/types.ts` -- `LotDetail`, `BidEvent`.

## Tasks & Acceptance

**Execution:**
- [x] `api/src/lots/lot-events.module.ts`, `lots.module.ts`, `bids.module.ts` -- módulo só do `LotEventsService`, importado por lotes, lances e liquidação (evita import circular lots ↔ settlement) -- commit `refactor(lots)`
- [x] `api/src/wallets/wallet.lock.ts`, `bids.service.ts` -- extrai `lockWallets` e `walletOf` para reuso -- commit `refactor(wallets)`
- [x] `api/src/receipts/receipt.signature.spec.ts` -- casos 1, 2, 3, 6 vermelhos -- `test(receipts)`; `receipt.signature.ts` `sign` -- `feat(receipts)`
- [ ] spec -- casos 4, 5 vermelhos -- `test(receipts)`; `verify` com `timingSafeEqual` -- `feat(receipts)`
- [x] `api/src/receipts/receipt.entity.ts` + migration `Receipts` (gerada pelo CLI, revisada) -- tabela e constraints -- `feat(receipts)`
- [x] `api/src/settlement/settlement.service.ts`, `settlement.module.ts`, `app.module.ts`, `lots/lot-events.service.ts`, `lots/dto/settled-event.dto.ts` -- transação, selo, movimentos, comprovante, evento; termina sem erro em `UNIQUE` -- `feat(settlement)`
- [x] `api/src/lots/lots.service.ts`, `dto/lot-detail.dto.ts`, `lots.module.ts`, `web/src/shared/api/types.ts`, `api/test/settlement.e2e-spec.ts` -- gatilho no `GET`, `result` e `me.receiptToken`, e2e -- `feat(lots)`
- [x] `README.md` (Comportamentos esperados), `docs/ai-log.md` -- `docs`

**Acceptance Criteria:**
- Given a migration, when roda, then `receipts` tem `UNIQUE (lot_id)`, `UNIQUE (token)`, `CHECK (amount > 0)` e FK para `lots`.
- Given lote vencido com lances e selo válido, when `GET /lots/:id`, then numa transação o vencedor perde `valor` em `balance` e `committed`, o leiloeiro ganha `valor` em `balance`, o comprovante assinado é gravado e `settled_at` preenchido; depois do commit sai o evento `settled`.
- Given lote liquidado, when `GET /lots/:id`, then responde `result: { alias, amount }`; `me.receiptToken` só quando `me.alias` é o alias do comprovante.
- Given lote ao vivo, já liquidado ou cancelado, when `GET /lots/:id`, then nenhuma transação de liquidação abre e o número de queries é o de antes (1), mais nenhuma.
- Given `npm run lint:check`, `npm test`, `npm run build` e `npm run test:e2e` em `api/` e `npm run build` em `web/`, when rodados, then passam.

## Design Notes

- `find()`: query 1 (com `LEFT JOIN receipts`); se `status = ended` e `settledAt` nulo, chama `settle` num `try/catch` e repete a query 1. Fixo: 1 query fora desse caso, 2 + transação nele.
- Vencedor reconhecido comparando `forLot(secret, viewer.id, id)` com o alias do comprovante, sem query extra (colisão de 30 bits entre licitantes do mesmo lote é desprezível).
- `settle` devolve `void`; lote inexistente ou cancelado, `NOT_ENDED` e `ALREADY_SETTLED` terminam em silêncio (o seed da 6.1 e o timer da 5.3 chamam fora de HTTP).
- Saldo do leiloeiro acima do teto do `integer` faz o `UPDATE` falhar: a transação reverte, o lote fica sem liquidar e o erro vai para o log (limitação aceita, como o teto do depósito).

## Implementation Notes

- `LotDetailDto.result` sempre presente: `null` até liquidar, `{ alias: null, amount: null }` sem lances.
- Receipt com `ManyToOne`: o `OneToOne` criava um segundo `UNIQUE` em `lot_id`. Coluna do hash final: `final_hash`.
- Carteiras atualizadas num `UPDATE ... FROM jsonb_to_recordset` só, depois da trava, sem query em loop.
- O e2e do selo apaga o único lance: apagando o último de dois, o `CHECK` da carteira revertia a transação e o teste passava sem a conferência.
- Depois da revisão: asserções de `result` e `me.receiptToken` na resposta do GET que liquida, rival que deu lance no teste do token, e D-064 (bloqueio pelo selo), citada no README e no service.

- Depois da apresentação, a pedido do usuário: `expectedSeal` em `audit/chain.ts` usado por lance e liquidação (sem a checagem de selo nulo redundante); `receipts.winner_user_id` (migration `ReceiptsWinner`, fora da resposta e da assinatura) e token entregue por id, com teste unitário que falhava com a comparação por alias; testes aprovados: falha na liquidação sem derrubar o GET (saldo do leiloeiro no teto), uma query fora do lote vencido, e acessos que não liquidam; limitações no README.

## Spec Change Log

## Review Triage Log

| Achado | Veredito | Evidência |
|---|---|---|
| Saldo do leiloeiro acima do teto do `integer` trava a liquidação (edge, blind) | low | Limitação aceita nas Design Notes; exige mais de R$ 21 mi acumulados. Correção pede guarda nova. Rejeitado. |
| Selo inválido tenta de novo e loga a cada acesso (edge, blind) | low | Trade-off aceito: lote adulterado é raro e o lock é curto. Correção pede estado novo. Rejeitado. |
| `settled_at` sem comprovante em lote com lances (edge) | false | Comprovante e `settled_at` gravados na mesma transação. |
| Carteira inexistente lança `wallet missing` (edge) | false | Todo usuário tem carteira desde o cadastro (D-039). |
| Resposta do GET que liquida não tem `result` conferido (gap, blind) | medium | Tirar o segundo `detail()` mantém a suíte verde. Patch: asserções nos testes existentes. |
| Teste do token: o "perdedor" nunca deu lance (blind) | low | Correção direta no mesmo teste; entra no patch acima. |
| Bloqueio da liquidação pelo selo cita a D-059, que é do lance (blind) | medium | Decisão do usuário sem entrada própria. Patch: D-064. |
| `catch` do `trySettle` sem teste (gap, blind) | medium | Selo inválido retorna sem lançar. Teste novo depende de aprovação do usuário. |
| Critério "1 query fora do caso vencido" sem teste (gap) | low | Teste novo depende de aprovação do usuário. |
| `ignoreDuplicate` nunca exercitado (gap) | maybe-false | Inalcançável com o lock no lote; vale testar se a 5.3 chamar sem o lock. Adiado. |
| Fixture do `makeFind` sem `settledAt` (gap) | low | Estilo de teste; listado, não corrigido. |
| `seal()` duplicado entre lance e liquidação; `seal === null` redundante (blind) | low | Estilo; listado, não corrigido. |
| Corrida não confere os corpos das respostas (blind) | low | Teste novo/asserção extra; listado. |
| Casos de pulo sem e2e (cancelado vencido, não terminou, segundo acesso) (blind) | low | Cobertos na regra da 5.1; casos novos dependem do usuário. Listado. |
| Colisão de alias entrega o token a outro (blind) | low | Probabilidade 2^-30 por par, aceita nas Design Notes. Rejeitado. |
| Front declara `SettledEvent` sem uso (blind) | false | Consumo é da 5.6. |
| Só o GET dispara a liquidação (blind) | false | Timer é a 5.3 (D-009). |
| Leiloeiro não recebe o token (blind) | false | Leiloeiro recebe pelo painel na 5.4 (epics). |
| `wallet.lock.ts` fora do padrão de nomes (blind) | low | Estilo; listado. |

## Verification

**Commands:**
- `cd api && npx jest src/receipts --silent` -- expected: casos 1 a 6 passam
- `cd api && npm run lint:check && npm test && npm run build && npm run test:e2e` -- expected: sucesso
- `cd web && npm run build` -- expected: sucesso
