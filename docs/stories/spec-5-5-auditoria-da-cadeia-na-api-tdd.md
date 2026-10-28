---
title: 'Auditoria da cadeia na API (TDD)'
type: 'feature'
created: '2026-10-27'
status: 'done'
baseline_commit: 'a9ab8f849e1a7ec47d7aceff6058435cf69efaaf'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/stories/epic-5-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** a cadeia de HMAC, o selo e o comprovante assinado existem desde a 4.2/5.2, mas ninguém consegue conferi-los: não há rota que diga se o histórico de um lote foi adulterado (FR22, D-012).

**Approach:** verificação pura `verify` em `audit/chain.ts` (TDD, casos 1 a 18) e duas rotas públicas: `GET /lots/:id/audit` (resultado, lances com alias e indicador por lance) e `GET /lots/number/:number` (devolve o id).

## Boundaries & Constraints

**Always:**
- Casos aprovados (`describe('chain.verify')`): 1 a 12 do `epics.md`, mais: 13. aponta como adulterado um lance com `seq` maior que 1 e `prev_hash` igual ao `GENESIS`; 14. selo nulo conta como não íntegro (D-058); 15. lote liquidado com hash final do comprovante diferente do último lance da cadeia não é íntegro; 16. lote liquidado com assinatura do comprovante inválida não é íntegro. Cada um é um `it` escrito antes da implementação, num commit `test` vermelho antes do `feat` (D-055).
- Lance `i` (ordem de `seq`, posição a partir de 1) está quebrado se: `seq ≠ i`, ou `prev_hash ≠` (`GENESIS` quando `i = 1`, senão o `hash` gravado do lance anterior), ou `hash ≠ hashBid(...)` recalculado com os campos gravados.
- Indicador por lance: `intact` antes do primeiro lance quebrado, `tampered` no primeiro quebrado, `unverifiable` nos seguintes (o elo anterior já não é confiável, então o que vem depois não prova nada). Com cadeia intacta, todos `intact`.
- Casos decididos depois: 17. lote liquidado com lances e sem comprovante dá `receipt_tampered`; 18. lote liquidado sem lances não tem comprovante e continua `intact`.
- Resultado, nesta prioridade: `tampered` (com `brokenSeq`); `truncated` quando a cadeia está intacta e o selo é nulo ou não bate com `expectedSeal`; `receipt_tampered` quando o lote liquidado tem lances e o comprovante falta, tem `final_hash` diferente do último lance ou assinatura inválida; `intact` caso contrário.
- Resposta só com dado público: alias de cada lance calculado de `user_id` + `lot_id` (`forLot`); nunca `user_id`, nome ou e-mail.
- Número fixo de queries: lote + comprovante numa query (left join), lances numa query só, ordenados por `seq`.
- Rotas públicas, sem guard. Contrato novo atualiza `web/src/shared/api/types.ts`; respostas como classes `*.dto.ts`.

**Never:** tela de auditoria (5.8); liquidar o lote na auditoria; migration; ancorar hash fora do banco; texto livre de erro.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Íntegro | lote com lances sem alteração | `result: 'intact'`, `brokenSeq: null`, todos `intact` | N/A |
| Valor alterado | `UPDATE bids SET amount` no `seq` 2 de 3 | `tampered`, `brokenSeq: 2`; marcas `intact`, `tampered`, `unverifiable` | N/A |
| Fim removido | `DELETE` do último lance | `truncated`, todos `intact` | N/A |
| Lote inexistente/cancelado | id sem lote ou com `cancelled_at` | 404 | `NotFoundException` |
| Número | `GET /lots/number/7` | `{ id }`; inexistente ou cancelado 404 | `LotIdPipe` faz 404 sem banco para formato inválido |

</frozen-after-approval>

## Code Map

- `api/src/audit/chain.ts` -- `GENESIS`, `hashBid`, `sealLot`, `expectedSeal`, `sign`. Ganha `verify`. Não mudar os formatos assinados.
- `api/src/audit/chain.spec.ts` -- factories `makeBid`/`makeSeal` a reaproveitar; o `describe('chain.verify')` entra aqui.
- `api/src/receipts/receipt.signature.ts` -- `verify(secret, fields, signature)` da assinatura; importa `sign` de `audit/chain`, então `chain.ts` importá-lo criaria ciclo.
- `api/src/audit/alias.ts` -- `forLot(secret, userId, lotId)`, também importa `sign` de `chain`.
- `api/src/settlement/settlement.service.ts` -- referência de leitura do último lance e do selo; não mexer.
- `api/src/lots/lot-status.ts` -- `STATUS_SQL` com `:now` para o status.
- `api/src/lots/lot-id.pipe.ts` -- inteiro positivo dentro do `integer`; reaproveitar para `:number`.
- `api/src/lots/lots.controller.ts` / `lots.service.ts` -- `assertExists` (filtra `cancelledAt`); rota por número entra aqui.
- `api/src/bids/bid.entity.ts`, `api/src/receipts/receipt.entity.ts`, `api/src/lots/lot.entity.ts` (`seal` nulo) -- colunas lidas.
- `api/test/app.ts`, `api/test/receipts.e2e-spec.ts` -- `start`, `reset`, `signup`, `deposit`, `createLot`, `bid`, `clock`, `db`, `SettlementService.settle`.

## Tasks & Acceptance

**Execution:**
- [x] `api/src/audit/sign.ts` -- extrair `sign` e `SignPrefix` de `chain.ts` (commit `refactor` à parte), com `alias.ts`, `chain.ts` e `receipt.signature.ts` importando dele -- permite `chain.ts` usar `receipt.signature.verify` sem ciclo.
- [x] `api/src/audit/chain.spec.ts` -- casos 1 a 18 e o indicador por lance, antes da implementação.
- [x] `api/src/audit/chain.ts` -- `verify(secret, { lotId, seal, bids, receipt })` → `{ result, brokenSeq, marks }`, puro.
- [x] `api/src/audit/audit.service.ts`, `audit.controller.ts` (`@Controller('lots')`, `GET :id/audit`), `audit.module.ts`, `dto/audit-response.dto.ts` -- duas queries, monta a resposta com `forLot`; registrar no `app.module.ts`.
- [x] `api/src/lots/lots.controller.ts`, `lots.service.ts`, `dto/lot-id.dto.ts` -- `GET /lots/number/:number` → `{ id }`, sem cancelados.
- [x] `api/test/audit.e2e-spec.ts` -- íntegro; `UPDATE` no valor; `DELETE` do último lance; `UPDATE` no `final_hash` do comprovante; 404 de inexistente, cancelado e número.
- [x] `web/src/shared/api/types.ts` -- tipos `LotAudit` e `LotId`.
- [x] `docs/ai-log.md` -- entrada da 5.5.

**Acceptance Criteria:**
- Given um lote não cancelado, when qualquer pessoa chama `GET /lots/:id/audit`, then recebe `id`, `number`, `title`, `status`, `result`, `brokenSeq` e `bids` com `seq`, `alias`, `amount`, `createdAt`, `hash` e `mark`, sem `user_id`.
- Given o log de queries ligado, when a rota de auditoria responde, then dispara 2 queries, para qualquer número de lances.
- Given `npm run test:e2e`, when a suíte de auditoria roda, then cada adulteração direta no banco é acusada pela rota.

## Design Notes

Formato da resposta:

```json
{ "id": 3, "number": 7, "title": "…", "status": "ended",
  "result": "tampered", "brokenSeq": 2,
  "bids": [{ "seq": 1, "alias": "Licitante ABC234", "amount": 100000,
             "createdAt": "…", "hash": "…", "mark": "intact" }] }
```

Selo nulo dá `truncated`: com a cadeia íntegra, o selo é a única evidência que falta, e a tela da 5.8 já trata `truncated` como não íntegro.

## Verification

**Commands:**
- `cd api && npx jest src/audit/chain.spec.ts --silent` -- expected: vermelho no commit `test`, verde no `feat`
- `cd api && npm run lint:check && npm test && npm run build && npm run test:e2e` -- expected: tudo verde
- `cd web && npm run lint:check && npm run build` -- expected: verde

## Implementation Notes

- `verify` recebe também `settled` (o lote tem `settled_at`), necessário para os casos 15 a 18.
- Três `it` além dos casos 1 a 18: lote liquidado com comprovante válido continua `intact` (sem ele, os casos 15 a 17 passariam com uma regra que sempre acusa), e dois do indicador por lance (cadeia intacta; antes, no e depois do quebrado).
- O e2e confere as 2 queries espiando `dataSource.logger.logQuery`.

## Spec Change Log

## Review Triage Log

| Achado | Veredito | Evidência e destino |
|---|---|---|
| Lote e lances lidos em queries separadas (READ COMMITTED): lance que comita entre elas dá `truncated` falso | high | `audit.service.ts` lê o selo e depois os lances; o lance grava lance e selo na mesma transação. patch: transação REPEATABLE READ |
| Alias da auditoria só conferido por regex no e2e | medium | Trocar os argumentos de `forLot` passaria em toda a suíte. patch: comparar com o alias da resposta do lance |
| e2e não cobre troca de `user_id` | low | Ameaça citada no CLAUDE.md; unitário cobre, e2e não. patch |
| Teste de 2 queries mede um tamanho só | low | Mede 4 lances; patch: 1 e 5 lances, contando só SELECT |
| Sem e2e de lote recém-criado sem lances `intact` | low | Unitário monta o selo à mão. patch |
| `settled_at` anulado ou comprovante em lote sem lances escapa da conferência do comprovante | maybe-false / intent_gap | A intenção só define o comprovante de lote liquidado com lances. Levado ao usuário |
| Comprovante não comparado com alias/valor do último lance | low | A assinatura cobre alias e valor; forjar exige o segredo. Rejeitado; listado ao usuário |
| Lista de lances sem paginação | false | A intenção pede a lista completa numa query só; registrar a exceção depende do usuário (D-NNN) |
| Casos 17/18 e `receipt_tampered` sem entrada no decisions.md | medium | CLAUDE.md exige D-NNN para leitura de regra ambígua já decidida. patch: D-065 |
| README: auditoria no item Lances dos Testes; linha em Comportamentos esperados | low | Estilo; listado ao usuário |
| sprint-status `in-progress` vs spec `in-review` | false | O passo final do workflow sincroniza o status |

Decisões do usuário depois da revisão: comprovante em lote não liquidado e em lote liquidado sem lances dão `receipt_tampered` (casos 19 e 20, D-065 atualizada); lista completa de lances registrada como exceção à paginação (D-066, CLAUDE.md); os três testes extras ficam; a comparação do alias do comprovante fica como está.
