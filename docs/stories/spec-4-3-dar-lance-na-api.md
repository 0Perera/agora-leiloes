---
title: 'Dar lance na API'
type: 'feature'
created: '2026-10-27'
status: 'done'
baseline_commit: '42ddfe59d37931a5462ee082369120893c48bd0e'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/stories/epic-4-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** a regra de lance (4.1) e a cadeia de HMAC (4.2) existem como funções puras, mas não há tabela de lances nem rota: o licitante ainda não consegue dar lance.

**Approach:** módulo `bids` com `POST /lots/:id/bids`, entidade e migration de `bids` (mais o selo em `lots`), e `BidsService.place` ligando `decide()`, `hashBid()` e `sealLot()` numa única transação com lock no lote e nas carteiras. Recusas viram `DomainException` 422 com detalhe (D-043).

## Boundaries & Constraints

**Always:**
- Ordem na transação, só com o `manager`: trava o lote (`FOR UPDATE`, `cancelledAt IS NULL`, senão 404) → **só então** lê `clock.now()` (lance que esperou o lock é julgado na hora em que o obteve) → último lance por `seq DESC` → carteiras travadas.
- Ids de usuário sem repetição (licitante que já é líder) antes de travar as carteiras, numa query com `ORDER BY wallet.id` e `FOR UPDATE`.
- Liderança e mínimo vêm do último lance de `bids`; `current_bid`/`bid_count` só são escritos, nunca lidos para decidir (D-042).
- `created_at` do lance = o mesmo `now` do Clock (milissegundos), gravado explicitamente; nunca `now()` do banco nem `CreateDateColumn` (D-056).
- Primeiro lance: `seq` 1 e `prev_hash` = `GENESIS` gravado. Seguintes: `seq` anterior + 1 e `prev_hash` = hash anterior.
- Aceite: um `UPDATE` no lote (`current_bid`, `bid_count = seq`, `ends_at`, `seal`), libera o valor cheio do líder anterior e compromete o valor cheio do novo lance.
- Códigos da `Refusal` amarrados ao `DomainCode` (`Extract<DomainCode, ...>`); quatro códigos novos no `DomainCode` e no filter, todos 422; detalhe na resposta: `startsAt`, `minimum`, `available`.
- Cancelamento: `EXISTS` em `bids` depois do lock do lote, no lugar de `bid_count > 0`.
- `PlaceBidDto`: `amount` `@IsInt`, `@Min(1)`, `@Max(2_147_483_647)`. Rota com `@Auth('BIDDER')` e `LotIdPipe`.
- Resposta: `{ seq, amount, alias, createdAt, endsAt }`. `web/src/shared/api/types.ts` atualizado.

**Decisões do usuário:**
- Índice: só o `UNIQUE (lot_id, seq)`, sem `bids_lot_id`. Desvio consciente do AC: a coluna inicial do índice composto já atende às buscas por lote.
- Selo de lote sem lances: `POST /lots` grava o selo vazio (`lotId`, 0, `GENESIS`) na mesma transação da criação. Para a 5.5, em `deferred-work.md`: selo nulo conta como não íntegro (só existe em lote criado antes desta migration; em produção o banco é recriado na entrega).
- Casos 1 a 14 aprovados; o caso 8 confere os quatro campos (`seal`, `current_bid`, `bid_count`, `ends_at`).

**Never:**
- `UPDATE`/`DELETE` em `bids`; dependência nova; SSE, histórico, `me.alias` (4.5); Testcontainers e teste de concorrência (4.4); timer de liquidação (épico 5).

**Casos de teste propostos (teste depois, unitário com `manager` falso, como `lots.service.spec.ts`):**

`describe('BidsService.place')`:
1. responde 404 quando o lote não existe ou está cancelado
2. lê a hora do Clock depois de travar o lote
3. trava uma carteira só quando o licitante já é o líder
4. trava as carteiras do licitante e do líder anterior em ordem de id
5. recusa com o código e o detalhe da regra sem gravar nada
6. grava o primeiro lance com seq 1, hash anterior genesis e data do Clock
7. encadeia o lance no hash do último lance com o seq seguinte
8. atualiza selo, lance atual, contagem e fim do lote
9. libera o comprometido do líder anterior e compromete o novo lance
10. licitante superado que volta compromete o valor cheio do novo lance
11. calcula o mínimo pelo último lance, não pela cópia do lote

12. `LotsService.cancel`: recusa com `LOT_HAS_BIDS` quando existe lance em `bids`, mesmo com `bid_count` zero
13. `DomainExceptionFilter.catch`: responde as recusas de lance com 422 e o detalhe (`it.each` nos quatro códigos novos)
14. `PlaceBidDto`: recusa valor não inteiro e acima do teto (`it.each`)

## I/O & Edge-Case Matrix

| Cenário | Entrada / estado | Resultado |
|---|---|---|
| Aceite | licitante, lote ao vivo, valor ≥ mínimo, saldo ok | 201 `{ seq, amount, alias, createdAt, endsAt }` |
| Recusa da regra | qualquer uma das 5 | 422 `{ code, ...detalhe }`, nada gravado |
| Lote cancelado/inexistente | — | 404 sem código |
| Leiloeiro | token AUCTIONEER | 403 `ROLE_NOT_ALLOWED` |
| Sem token | — | 401 |
| Valor inválido | `1.5`, `2147483648`, ausente | 400 `VALIDATION_FAILED` |
| Faltando ≤ 2 min | lance aceito | `endsAt` += 2 min, na resposta |

</frozen-after-approval>

## Code Map

- `api/src/bids/bid.rules.ts` -- `decide(state)`; tipos `Refusal`/`BidDecision`. Só mudar os literais do `code` para `Extract<DomainCode, ...>` e exportar `Refusal`.
- `api/src/audit/chain.ts` (`GENESIS`, `hashBid`, `sealLot`), `audit/alias.ts` (`forLot`) -- reaproveitar; não alterar.
- `api/src/common/domain.exception.ts` + `domain-exception.filter.ts` (+ spec) -- `DomainException` ganha `detail?: Record<string, unknown>`; filter responde `{ code, ...detail }`.
- `api/src/lots/lot.entity.ts` -- nova coluna `seal varchar(64)` nullable.
- `api/src/lots/lots.service.ts` -- `cancel()` (linha ~160) e `insert()` (selo vazio). Construtor ganha `ConfigService<Env, true>`; os 3 helpers de `lots.service.spec.ts` passam a recebê-lo.
- `api/src/lots/lot.rules.ts` -- `CancelState.bidCount` vira `hasBids: boolean`; ajustar `lot.rules.spec.ts`.
- `api/src/lots/lot-id.pipe.ts`, `common/auth.decorator.ts`, `common/current-user.decorator.ts` -- reaproveitar na rota.
- `api/src/wallets/wallet.entity.ts` -- `balance`, `committed`; disponível = `balance - committed`. `MAX_BALANCE` em `wallet.rules.ts`.
- `api/src/auth/auth.module.ts` -- padrão para ler segredo: `ConfigService<Env, true>.get('BID_HMAC_SECRET', { infer: true })`.
- `api/src/database/migrations/` -- gerar com `npm run migration:generate`; `dashboard.service.ts` continua usando `bidCount` (exibição, não mexer).
- `web/src/shared/api/types.ts` -- tipos `PlaceBidRequest` e `PlacedBid`.

## Tasks & Acceptance

**Execution:**
- [x] `docs/stories/sprint-status.yaml` -- 4-2 `done` (feito), 4-3 `in-progress`
- [x] `api/src/bids/bid.rules.ts` -- `refactor`: códigos ligados ao `DomainCode`
- [x] `api/src/common/domain.exception.ts`, `domain-exception.filter.ts` (+ spec) -- detalhe e 4 códigos novos (caso 13)
- [x] `api/src/bids/bid.entity.ts`, `lots/lot.entity.ts`, migration -- `bids` com FKs, `CHECK (seq >= 1 AND amount > 0)`, `UNIQUE (lot_id, seq)` (sem índice separado em `lot_id`); `lots.seal`
- [x] `api/src/bids/dto/place-bid.dto.ts` (+ spec, caso 14), `dto/bid-response.dto.ts`
- [x] `api/src/bids/bids.service.ts` (+ spec, casos 1-11), `bids.controller.ts`, `bids.module.ts`, `app.module.ts`
- [x] `api/src/lots/lots.service.ts`, `lot.rules.ts` (+ specs, caso 12) -- `EXISTS` no cancelamento; selo vazio gravado na criação
- [x] `web/src/shared/api/types.ts` -- contrato do lance
- [x] `README.md` (fluxo de um lance em Arquitetura, linha de Testes), `docs/decisions.md` (D-057 índice, D-058 selo vazio), `docs/ai-log.md`, `deferred-work.md` (marcar os 4 itens da 4.3 como feitos; item do selo nulo para a 5.5)

**Acceptance Criteria:**
- Given o código, when buscado, then não há `update`/`delete`/`save` sobre `Bid` nem leitura de `currentBid`/`bidCount` no `BidsService`.
- Given a API local com o log de queries ligado temporariamente, when `POST /lots/:id/bids` roda, then dispara número fixo de queries (lote, último lance, carteiras, insert, update do lote, 1-2 updates de carteira), registrado nas Implementation Notes.

## Design Notes

Carteiras numa query só: `find(Wallet, { where: { userId: In(ids) }, order: { id: 'ASC' }, lock: { mode: 'pessimistic_write' } })` — o Postgres trava as linhas na ordem do `ORDER BY`. `ids = [...new Set([userId, last?.userId].filter(...))]`. Se o licitante já é líder, a regra recusa `ALREADY_WINNING` depois do lock, sem gravar.

Valores das carteiras escritos a partir da linha travada (`committed: wallet.committed ± amount`), sem ler fora da transação.

## Verification

**Commands:**
- `cd api && npx jest src/bids src/lots src/common --silent` -- expected: verdes
- `cd api && npm run lint:check && npm test --silent && npm run build` -- expected: tudo verde
- `cd web && npm run lint:check && npm run build` -- expected: verde

**Manual checks:**
- API local: lance aceito, recusa `BID_BELOW_MINIMUM` com `minimum`, 403 do leiloeiro, 404 de lote cancelado; contagem de queries no log.

## Implementation Notes

- Queries do `POST /lots/:id/bids` (log de queries ligado temporariamente, API local), fora `START TRANSACTION`/`COMMIT`:
  - aceite com líder anterior: 7 (lote `FOR UPDATE`, último lance, carteiras `IN (...) ORDER BY id FOR UPDATE`, `INSERT` em `bids`, `UPDATE` do lote, 2 `UPDATE` de carteira);
  - primeiro lance: 6 (um só `UPDATE` de carteira);
  - recusa: 3 (lote, último lance, carteiras) e `ROLLBACK`.
- Conferido na API local: 201 com `endsAt` prorrogado em 2 min, `ALREADY_WINNING`, `BID_BELOW_MINIMUM` com `minimum`, `INSUFFICIENT_BALANCE` com `available`, `LOT_NOT_STARTED` com `startsAt`, 403 do leiloeiro, 401 sem token, 400 para `1.5`, `2147483648` e corpo vazio, 404 de lote cancelado e inexistente, `LOT_HAS_BIDS` no cancelamento, cadeia (`GENESIS` → hash do lance 1) e selo gravado no lote novo.
- Selo vazio na criação: `UPDATE` do lote logo depois do `INSERT`, na mesma transação, porque o selo leva o `lot_id` gerado.
- `ApiErrorBody` do front ganhou `startsAt`, `minimum` e `available` (detalhe das recusas), além de `PlaceBidRequest`/`PlacedBid`.
- Decisões do usuário na revisão: casos a-f aprovados (achados 5, 6, 7, 9, 10, 11); achado 1 tratado com a conferência do selo antes de gravar (409 `LOT_INTEGRITY_FAILED`, TDD com commit vermelho, D-059); achados 4 e 11 (estilo) corrigidos; tradução do código novo registrada para a 4.6.
- O caso do selo fica antes do lock das carteiras: a recusa por integridade usa só o lote e o último lance, e o lance recusado assim dispara 2 queries.

## Spec Change Log

## Review Triage Log

| # | Achado | Veredito | Evidência |
|---|---|---|---|
| 1 | Lance novo depois de lances removidos do fim reusa o `seq` e reassina o selo, apagando a evidência (edge) | low | exige escrita direta no banco; mesma classe da limitação da D-012 (restauração não detectada); guarda nova muda comportamento do lance; rejeitado, levado ao usuário |
| 2 | Carteira ausente vira 500 genérico (edge, blind) | false | carteira nasce na mesma transação do cadastro (`WalletsService.open`); estado inalcançável |
| 3 | `committed` menor que o último lance viola o CHECK com 500 (edge) | false | o comprometido do líder só muda nesta transação, com as carteiras travadas; estado inalcançável sem adulteração |
| 4 | `detail` com chave `code` sobrescreve o código no filter (edge, blind) | low | só `refused()` cria detalhe e ele remove `code`; não é grave, listado sem corrigir |
| 5 | Selo vazio da criação sem teste (verification, blind) | medium | nenhum teste executa `insert()` com sucesso; caso novo depende do usuário |
| 6 | Resposta do `place` (`alias`, `createdAt`, `endsAt`) sem asserção (verification, blind) | medium | casos 1-11 ignoram o retorno; caso novo depende do usuário |
| 7 | `EXISTS` depois do lock sem teste de ordem no cancelamento (verification) | medium | mocks resolvem em qualquer ordem; caso novo depende do usuário |
| 8 | `@Auth('BIDDER')` da rota sem teste automatizado (verification) | medium | sem teste HTTP no repo; adiado para o e2e da 4.4 |
| 9 | DTO sem caso de valor ausente, zero e valor válido (blind) | low | `@IsInt`/`@Min(1)` padrão; caso novo depende do usuário |
| 10 | Só `BID_BELOW_MINIMUM` confere que a recusa não grava (blind) | low | `refused()` é o mesmo caminho para todas; caso novo depende do usuário |
| 11 | `makeCancel` ainda tipa `bidCount`; falta o caso `bid_count > 0` sem lances cancelar (blind) | low | tipo é estilo (listado); caso novo depende do usuário |
| 12 | spec `in-review` e sprint `in-progress` (blind) | false | o passo seguinte do fluxo sincroniza o status |
| 13 | README com placeholder ao lado do texto novo e explicação de código (blind) | false | o placeholder ainda cobre módulos e liquidação; o orçamento do README prevê o fluxo de um lance em Arquitetura |
| 14 | Sem deferred para tradução das recusas no front e timer de liquidação (blind) | false | tradução é escopo da 4.6 e o timer do épico 5, ambos no `epics.md` |
