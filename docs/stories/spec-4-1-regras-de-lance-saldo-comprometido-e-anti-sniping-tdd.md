---
title: 'Regras de lance, saldo comprometido e anti-sniping (TDD)'
type: 'feature'
created: '2026-10-27'
status: 'in-progress'
baseline_commit: '52109e9be10f85cc9f92c94dd5390c26cdd93a58'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/stories/epic-4-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** ainda não existe nenhuma regra que decida se um lance é aceito. A 4.3 (dar lance na API) precisa de uma decisão pura e testada para chamar dentro da transação, com o lote e as carteiras travados.

**Approach:** função pura `decide` em `api/src/bids/bid.rules.ts`, escrita em TDD em `bid.rules.spec.ts`. Recebe o estado (lote, último lance, licitante, disponível, valor, `now`) e devolve aceite (novo `endsAt` e movimentos de saldo) ou recusa (código e o dado que a mensagem do front precisa). Sem endpoint, sem TypeORM.

## Boundaries & Constraints

**Always:**
- Entrada: `lot { startsAt, endsAt, startingBid, increment }`, `last { userId, amount } | null`, `userId`, `available` (saldo − comprometido, calculado por quem chama), `amount`, `now`. Tudo em centavos inteiros e `Date`.
- Ordem das checagens: status do lote → líder → valor → saldo. A primeira que falha decide.
- Status: `now < startsAt` → `LOT_NOT_STARTED` com `startsAt`; `now >= endsAt` → `LOT_ENDED`. Início é inclusivo, fim é exclusivo (mesma convenção do `STATUS_SQL`).
- Líder: `last?.userId === userId` → `ALREADY_WINNING`.
- Valor: mínimo = `startingBid` sem lance, senão `last.amount + increment`. `amount < mínimo` → `BID_BELOW_MINIMUM` com `minimum`.
- Saldo: `amount > available` → `INSUFFICIENT_BALANCE` com `available`. Igual ao disponível é aceito.
- Aceite: `commit = { userId, amount }` (valor cheio do novo lance); `release = last` (valor cheio do líder anterior) ou `null` no primeiro lance.
- Anti-sniping: `endsAt − now <= 2 min` → novo `endsAt = endsAt + 2 min` (soma ao fim atual, não ao `now`); senão `endsAt` inalterado. Recusa nunca prorroga.
- Recusa é **retornada**, não lançada: a 4.3 converte em `DomainException`. Os códigos novos entram no `DomainCode` e no filter só na 4.3.
- Função quebrada em funções menores por grupo de checagem (`complexity: 10`). Sem `any`.
- Spec: `describe('BidRules.decide')` com um `describe` aninhado por grupo; factories `makeLot()`, `makeBid()`; tempos relativos a um `NOW` fixo, como em `lot.rules.spec.ts`.
- TDD em pares de commits por grupo: `test(bids)` com os `it` falhando, depois `feat(bids)` com a implementação que os faz passar.

**Never:** endpoint, service, entidade, migration, TypeORM ou mock de repository; teto de valor do lance (validação de DTO, 4.3); lote cancelado ou inexistente (404 na 4.3); HMAC ou alias (4.2); casos de teste além dos 27 aprovados; dependência nova.

## I/O & Edge-Case Matrix

Casos aprovados (cada um é um `it`, nesta redação):

| Grupo | Casos |
|---|---|
| status do lote | 1. recusa lance antes do início · 2. aceita lance no instante exato do início · 3. recusa lance no instante exato do fim · 4. recusa lance depois do fim · 27. a recusa por lote não iniciado informa o início |
| valor | 5. aceita primeiro lance igual ao lance inicial · 6. recusa primeiro lance abaixo do lance inicial · 7. aceita lance seguinte igual ao atual mais o incremento · 8. recusa lance seguinte abaixo do atual mais o incremento · 9. informa o mínimo aceito na recusa por valor |
| líder | 10. recusa lance de quem já lidera · 11. aceita lance de quem foi superado · 12. recusa por liderança antes de checar o valor |
| saldo | 13. recusa lance acima do disponível · 14. aceita lance igual ao disponível · 15. recusa por status antes de checar o saldo · 25. recusa por valor antes de checar o saldo (lance abaixo do mínimo e sem saldo responde BID_BELOW_MINIMUM) · 26. a recusa por saldo informa o disponível |
| saldo comprometido | 16. compromete o valor do lance na carteira do novo líder · 17. libera o valor do líder anterior · 18. primeiro lance não libera saldo de ninguém · 19. compromete o valor cheio do novo lance de quem foi superado e volta, não a diferença |
| anti-sniping | 20. prorroga 2 min quando faltam exatamente 2 min · 21. prorroga somando ao fim atual, não ao horário do lance · 22. não prorroga quando faltam mais de 2 min · 23. acumula prorrogação sobre um fim já prorrogado · 24. lance recusado não prorroga |

</frozen-after-approval>

## Code Map

- `api/src/lots/lot.rules.ts` / `lot.rules.spec.ts` -- modelo a seguir: funções puras exportadas, tipos de estado ao lado, `NOW` fixo + `at(offset)` + factories no spec.
- `api/src/wallets/wallet.rules.ts` -- outro exemplo de regra pura; não alterar.
- `api/src/lots/lot-status.ts` -- `STATUS_SQL`: início inclusivo (`startsAt <= now`), fim exclusivo (`now < endsAt`); a regra usa a mesma fronteira.
- `api/src/common/domain.exception.ts` -- `DomainCode`; **não** alterar nesta story (a 4.3 acrescenta os códigos de lance).
- `api/src/bids/` -- pasta nova prevista no CLAUDE.md; nesta story só `bid.rules.ts` e `bid.rules.spec.ts`.

## Tasks & Acceptance

**Execution:**
- [ ] `docs/stories/sprint-status.yaml` -- 3-7 `done`; 4-1 `in-progress`; épico 4 `in-progress`
- [ ] `api/src/bids/bid.rules.spec.ts` + `bid.rules.ts` -- seis ciclos vermelho/verde, um por grupo, na ordem: status do lote, líder, valor, saldo, saldo comprometido, anti-sniping
- [ ] `docs/ai-log.md` -- entrada da story 4.1

**Acceptance Criteria:**
- Given os 27 casos, when a story termina, then cada um é um `it` em `bid.rules.spec.ts`, escrito antes da implementação, e todos passam.
- Given `bid.rules.ts`, when inspecionado, then não importa TypeORM nem Nest e o spec não usa mock.
- Given uma recusa, when a regra decide, then o código é um de `LOT_NOT_STARTED`, `LOT_ENDED`, `ALREADY_WINNING`, `BID_BELOW_MINIMUM`, `INSUFFICIENT_BALANCE`, com `minimum`, `available` ou `startsAt` quando couber.
- Given o histórico da branch, when lido, then cada `test(bids)` vem antes do `feat(bids)` correspondente.

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Design Notes

Formato da decisão (união discriminada, para a 4.3 mapear sem `as`):

```ts
type Movement = { userId: number; amount: number };
type BidDecision =
  | { accepted: true; endsAt: Date; commit: Movement; release: Movement | null }
  | { accepted: false; code: 'LOT_NOT_STARTED'; startsAt: Date }
  | { accepted: false; code: 'LOT_ENDED' | 'ALREADY_WINNING' }
  | { accepted: false; code: 'BID_BELOW_MINIMUM'; minimum: number }
  | { accepted: false; code: 'INSUFFICIENT_BALANCE'; available: number };
```

Commits vermelhos quebram a regra "todo commit passa nos testes" do CLAUDE.md de propósito: o pedido da story é que o histórico mostre o teste antes do código. O CI roda só no topo da PR, que fica verde.

## Verification

**Commands:**
- `cd api && npx jest src/bids/bid.rules.spec.ts --silent` -- vermelho no commit `test`, verde no `feat`
- `cd api && npm run lint:check && npm test && npm run build` -- tudo verde antes do último commit
