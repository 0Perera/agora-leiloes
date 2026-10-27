---
title: 'Regras de liquidação (TDD)'
type: 'feature'
created: '2026-10-27'
status: 'done'
baseline_commit: 'adab04dfcd79178a4628aa68becfc11f0d58511e'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/stories/epic-5-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** nada decide ainda o que acontece quando um lote vence. A 5.2 (liquidação na API) precisa de uma decisão pura e testada para chamar dentro da transação, com o lote e as carteiras travados, garantindo que o dinheiro certo se mova uma vez só.

**Approach:** função pura `decide` em `api/src/settlement/settlement.rules.ts`, escrita em TDD em `settlement.rules.spec.ts`. Recebe o lote, o último lance da cadeia (ou nenhum) e `now`, e devolve: não liquidar (com o motivo), fechar sem vencedor, ou liquidar (vencedor, valor e movimentos nas duas carteiras). Sem endpoint, sem TypeORM.

## Boundaries & Constraints

**Always:**
- Entrada: `lot { endsAt, cancelledAt, settledAt, currentBid, auctioneerId }`, `last { userId, amount } | null` (último lance da cadeia), `now`. Centavos inteiros e `Date`. `auctioneerId` incluído a pedido do usuário (o caso 12 credita o leiloeiro).
- Ordem dos motivos para não liquidar (a primeira que falha decide): cancelado → já liquidado → ainda não terminou. Decisão do usuário, fixada pelos casos 14 e 15.
- Fim: encerrado quando `now >= endsAt`, mesmo limite da 4.1; liquida no instante exato do fim. Vale o `endsAt` recebido (já prorrogado).
- Valor e vencedor vêm só de `last`, nunca de `currentBid` (D-042).
- Movimentos como variações com sinal por carteira: vencedor `{ balance: -valor, committed: -valor }`, leiloeiro `{ balance: +valor, committed: 0 }`. A regra só conhece este lote: o comprometido de outros lotes não entra na conta.
- Função quebrada em funções menores (`complexity: 10`). Sem `any`.
- Spec: `describe('decide')` (mesma forma aprovada na 4.1) com um `describe` aninhado por grupo; factories `makeLot()`, `makeState()`; tempos relativos a um `NOW` fixo.
- TDD em pares de commits por grupo: `test(settlement)` com os `it` falhando, depois `feat(settlement)` que os faz passar (D-055).

**Never:** endpoint, service, entidade, migration, TypeORM ou mock de repository; comprovante, assinatura ou conferência do selo (5.2); timer (5.3); casos além dos 16 aprovados; dependência nova.

## I/O & Edge-Case Matrix

Casos aprovados (`it` em português, um por caso):

| # | Grupo | Estado | Resultado |
|---|-------|--------|-----------|
| 1 | quando liquidar | `now = endsAt − 1 ms` | não liquida, motivo ainda não terminou |
| 2 | quando liquidar | `now = endsAt` | liquida |
| 3 | quando liquidar | fim prorrogado já passou, original não importa | liquida pelo `endsAt` recebido (e não liquida antes dele) |
| 4 | quando liquidar | `settledAt` preenchido | motivo já liquidado |
| 5 | quando liquidar | `cancelledAt` preenchido | motivo cancelado |
| 14 | quando liquidar | cancelado e vencido | motivo cancelado |
| 15 | quando liquidar | já liquidado e vencido | motivo já liquidado |
| 16 | quando liquidar | cancelado e já liquidado | motivo cancelado (aprovado na revisão) |
| 6 | resultado | vencido, `last = null` | fecha sem vencedor |
| 7 | resultado | vencido, `last = null` | nenhum movimento |
| 8 | resultado | vencido com `last` | vencedor = `last.userId` |
| 9 | resultado | `currentBid` ≠ `last.amount` | valor = `last.amount` |
| 10 | movimentos | vencido com `last` | vencedor: `balance −valor` |
| 11 | movimentos | vencido com `last` | vencedor: `committed −valor` |
| 12 | movimentos | vencido com `last` | leiloeiro (`auctioneerId`): `balance +valor` |
| 13 | movimentos | vencedor lidera outro lote | vencedor: `committed` varia só pelo valor deste lote |

</frozen-after-approval>

## Code Map

- `api/src/bids/bid.rules.ts` -- modelo a seguir: tipos exportados, `decide(state)`, recusa por valor (não exceção), checagens em funções pequenas encadeadas com `??`. Reaproveitar o tipo `Movement` (`{ userId, amount }`) para `last`.
- `api/src/bids/bid.rules.spec.ts` -- modelo do spec: `NOW`, `at(offset)`, `makeLot`, `describe` aninhado.
- `api/src/lots/lot.entity.ts` -- nomes dos campos (`endsAt`, `cancelledAt`, `settledAt`, `currentBid`, `auctioneerId`); não alterar.
- `api/src/common/domain.exception.ts` -- não alterar: o motivo não é `DomainCode` (não liquidar não é erro de requisição).
- `api/src/settlement/` -- pasta nova prevista no CLAUDE.md; só os dois arquivos da regra.

## Tasks & Acceptance

**Execution:**
- [x] `api/src/settlement/settlement.rules.spec.ts` -- grupo "quando liquidar" (1-5, 14, 15) falhando -- commit `test(settlement)`
- [x] `api/src/settlement/settlement.rules.ts` -- tipos e checagem de motivo -- commit `feat(settlement)`
- [x] spec -- grupos "resultado" (6-9) e "movimentos" (10-13) falhando -- commit `test(settlement)`
- [x] rules -- vencedor, valor e movimentos -- commit `feat(settlement)`
- [x] `docs/stories/deferred-work.md` -- entrada para a 5.2: conferir o selo do lote antes de mover saldo (D-059); selo inválido não liquida e registra o motivo, porque apagar o último lance direto no banco faria cobrar o penúltimo licitante
- [x] `docs/ai-log.md` -- entrada da 5.1

**Acceptance Criteria:**
- Given os 15 casos aprovados, when a story termina, then cada caso é um `it` escrito antes da implementação, todos passam, e `settlement.rules.ts` não importa TypeORM nem Nest.
- Given `npm run lint:check` e `npm test` em `api/`, when rodados antes de cada commit `feat`, then passam.

## Design Notes

Formato da decisão (nomes finais podem variar na implementação):

```ts
type Skip = { settle: false; reason: 'CANCELLED' | 'ALREADY_SETTLED' | 'NOT_ENDED' };
type Close = { settle: true; winner: Movement | null; moves: WalletMove[] };
type WalletMove = { userId: number; balance: number; committed: number };
```

Sem lance: `{ settle: true, winner: null, moves: [] }`. O caso 13 fica garantido pela forma (variação, não saldo final); o e2e da 5.2 confere nas carteiras reais.

## Implementation Notes

- Commits em dois pares TDD (`09ff047`/`8170284`, `ed0ad96`/`5a819e8`) e docs em `038d90a`. O primeiro `feat` devolve só `{ settle: true }`, para o segundo `test` nascer vermelho.
- `last` e `winner` reaproveitam o tipo `Movement` da `bid.rules.ts`.
- Depois da revisão, a pedido do usuário: caso 16 (commit `test` que nasce verde; falha com as checagens invertidas), caso 3 conferido 1 ms antes do fim prorrogado e casos de movimentos comparando a lista inteira.
- Os casos 10 a 13 viraram um teste só (`move o valor do último lance do vencedor para o leiloeiro e mais nada`): com a comparação da lista inteira, os quatro ficaram idênticos, e um teste cobre débito, liberação do comprometido, crédito do leiloeiro e ausência de outro movimento. A spec passa a ter 13 testes para os 16 casos.
- Ajustes de documentação depois da revisão: contrato no `epic-5-context.md`, evidência da pendência do selo e ai-log.

## Spec Change Log

## Review Triage Log

| Achado | Veredito | Evidência |
|---|---|---|
| Leiloeiro como autor do último lance gera dois movimentos na mesma carteira (edge) | false | Leiloeiro não dá lance (`ROLE_NOT_ALLOWED` na 4.3); estado inalcançável. |
| Valor zero ou negativo inverte o fluxo (edge, blind) | low | Lance passa pelo mínimo da 4.1 e pelo DTO; guarda nova sem caso aprovado. Rejeitado. |
| `Invalid Date` liquida na hora (edge) | false | Datas vêm de `timestamptz` do banco e do `Clock`; nunca inválidas. |
| Caso 13 não modela o outro lote (edge, blind) | low | Previsto nas Design Notes: a regra só conhece este lote; o e2e da 5.2 confere nas carteiras. |
| Ordem cancelado → já liquidado não fixada por teste (gap, blind) | medium | Nenhum caso tem `cancelledAt` e `settledAt` juntos; inverter as checagens mantém tudo verde. Caso 16 depende de aprovação do usuário. |
| ai-log diz que os casos 14 e 15 fixam a ordem (gap) | low | Corrigido no ai-log. |
| "Sugestões rejeitadas" vazia no ai-log (edge, blind) | low | Corrigido: "Nenhuma." |
| Evidência da pendência do selo imprecisa (blind) | medium | O comprometido do penúltimo já foi liberado; corrigido para citar o `CHECK` e a reserva de outro lote. |
| `epic-5-context.md` sem `auctioneerId` e com `SettlementRules.decide` (blind) | medium | Reaproveitado pela 5.2; corrigido. |
| Casos 4 e 5 usam lote liquidado/cancelado antes do fim (blind) | low | Válidos: fixam a ordem contra `NOT_ENDED`; 14 e 15 cobrem o lote vencido. Rejeitado. |
| Caso 3 com duas asserções (blind) | low | Estilo; listado ao usuário, não corrigido. |
| Movimentos sem conferir a lista inteira (blind) | low | Estilo de teste; listado ao usuário, não corrigido. |
| `currentBid` não lido pela regra (blind) | false | Entrada definida na story; existe para o caso 9 (D-042). |
| `Movement` como tipo do vencedor (blind) | low | Nome; listado ao usuário, não corrigido. |
| Status da spec diverge do sprint-status (blind) | false | Fluxo do BMAD: ambos vão para `done`/`review` no fim. |

## Verification

**Commands:**
- `cd api && npx jest src/settlement/settlement.rules.spec.ts --silent` -- expected: 15 passam
- `cd api && npm run lint:check && npm test && npm run build` -- expected: sucesso
