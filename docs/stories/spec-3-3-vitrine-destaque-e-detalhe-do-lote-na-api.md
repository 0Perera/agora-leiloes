---
title: 'Vitrine, destaque e detalhe do lote na API'
type: 'feature'
created: '2026-10-26'
status: 'done'
baseline_commit: 'e23d9fe822241ce9e1afe361e6099056a1f4628a'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/stories/epic-3-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** os lotes já são criados (3.2), mas ninguém consegue vê-los: a página inicial (3.6) e a sala (3.7) precisam de vitrine por status, destaque e detalhe do lote.

**Approach:** três endpoints públicos no `LotsController`: `GET /lots` (vitrine paginada com contagem por aba), `GET /lots/featured` (D-037) e `GET /lots/:id` (estado completo + `serverTime`). Status calculado no SQL com o `now` do `Clock` (D-010).

## Boundaries & Constraints

**Always:**
- Público, sem guard. Nenhum endpoint chama a Cleveland nem carrega `lot_images`.
- `cancelled_at IS NULL` em todas as queries: cancelado nunca aparece; `GET /lots/:id` de cancelado ou inexistente → 404.
- Status por `CASE` no SQL com `:now = clock.now()`: `scheduled` (`now < starts_at`), `live` (`starts_at <= now < ends_at`), `ended` (`now >= ends_at`). O mesmo `now` vira o `serverTime` (ISO) do detalhe.
- `GET /lots` query (DTO): `status` (`live|scheduled|ended`, padrão `live`), `q` (trim, até 100, vazio = ignorado), `number` (inteiro 1..2147483647), `page` (inteiro >= 1, até 100 como no catálogo, padrão 1). Erro → 400 `VALIDATION_FAILED`.
- `q` filtra `title ILIKE` ou `artist ILIKE` com `\`, `%` e `_` escapados (o termo é literal). `number` é igualdade; a API não converte romano.
- Resposta da vitrine: `{ items, page, pageSize: 12, total, counts: { live, scheduled, ended } }`. Card: `id`, `number`, `title`, `artist`, `startingBid`, `currentBid` (nulo), `startsAt`, `endsAt`, `status`. `counts` com `q`/`number` aplicados; `total = counts[status]`.
- Ordem: live `ends_at ASC`; scheduled `starts_at ASC`; ended `ends_at DESC`; desempate por `number`.
- Destaque, em cadeia (para no primeiro achado): ao vivo com `current_bid IS NOT NULL` por `current_bid DESC, ends_at ASC, number ASC`; ao vivo por `ends_at ASC, number ASC`; agendado por `starts_at ASC, number ASC`; nada → 204 sem corpo. Resposta: o mesmo card.
- Índice `lots_current_bid` em `current_bid` (D-037), migration gerada pelo CLI.
- Detalhe: `id`, `number`, snapshot (`artworkId`, `accessionNumber`, `title`, `artist`, `date`, `type`, `technique`, `measurements`, `description`, `department`), `startingBid`, `increment`, `startsAt`, `endsAt`, `status`, `currentBid`, `bidCount`, `serverTime`.
- `:id` validado por um `LotIdPipe` (inteiro 1..2147483647, senão 404, o padrão já usado em `/lots/:id/image`), aplicado também na imagem; a checagem sai do `LotsService.image`.
- Rotas: `featured` declarada antes de `:id`.
- Queries fixas: vitrine 2 (itens + contagens), destaque até 3, detalhe 1.
- Respostas como classes `*.dto.ts`; tipos espelhados em `web/src/shared/api/types.ts`.

**Never:** `me.alias` no detalhe (4.5); painel/cancelamento (3.4); telas (3.6/3.7); `auctioneer_id` ou `settled_at` na resposta; coluna de status; índice de texto; dependência nova.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Vitrine | lotes nos 3 status + 1 cancelado, `status=live` | só ao vivo, por fim mais próximo; `counts` sem o cancelado | N/A |
| Busca | `q=rembrandt` / `q=50%` | ILIKE sem caixa / `%` literal | N/A |
| Número | `number=7` / `number=VII` | lote 7 / 400 | `VALIDATION_FAILED` |
| Página vazia | página além do total | `items: []`, `counts` corretos | N/A |
| Destaque | ver cadeia acima | lote escolhido | 204 sem lote |
| Detalhe | lote existente | estado completo + `serverTime` | N/A |
| Detalhe inválido | cancelado, inexistente, `abc`, `0`, `9999999999` | 404 | sem tocar o banco quando o id é inválido |

**Casos de teste (aprovados pelo usuário):** `lots.service.spec.ts` (`LotsService.featured`, repository falso): (1) devolve o ao vivo com maior lance, desempatando por fim mais próximo e depois por número; (2) sem ao vivo com lance, devolve o ao vivo que encerra primeiro; (3) sem ao vivo, devolve o próximo agendado; (4) sem lote, devolve nulo. `list-lots-query.dto.spec.ts`: (5) recusa `number` romano; (6) recusa status fora da lista. `lot-id.pipe.spec.ts`: (7) recusa id não inteiro com 404; (8) recusa id acima do teto com 404.

</frozen-after-approval>

## Code Map

- `api/src/lots/lots.controller.ts` -- adicionar `GET /`, `GET /featured` (com `@HttpCode` 204 via `res.status` quando nulo), `GET /:id`; trocar `Number(id)` do `image` pelo `LotIdPipe`.
- `api/src/lots/lots.service.ts` -- `list`, `featured`, `find`; tirar a checagem de id (e `MAX_ID`) do `image`. Leituras pelo repository injetado de `Lot` (fora de transação; registrar no `TypeOrmModule.forFeature` do `lots.module.ts`).
- `api/src/lots/lot.entity.ts` -- `@Index('lots_current_bid')` em `currentBid`; migration via `npm run migration:generate -- src/database/migrations/LotsCurrentBid` (compose de pé: `agora-postgres`).
- `api/src/catalog/dto/search-query.dto.ts` -- modelo de DTO de query (`trim`, `@Type(() => Number)`, `page` 1..100); `catalog.service.ts` usa `PAGE_SIZE = 12`.
- `api/src/catalog/dto/search-response.dto.ts`, `lots/dto/lot-response.dto.ts` -- modelo de response DTO como classe + `to...()`.
- `api/src/common/validation.pipe.ts` -- formato `VALIDATION_FAILED`; `catalog/dto/search-query.dto.spec.ts` mostra como testar DTO pelo pipe.
- `api/src/lots/lots.service.spec.ts` -- factory/construtor do service (`dataSource`, `catalog`, `clock`, repos); adicionar o repo de `Lot`.
- `web/src/shared/api/types.ts` -- adicionar `LotStatus`, `LotCard`, `LotShowcase`, `LotDetail`.

## Tasks & Acceptance

**Execution:**
- [x] `docs/stories/sprint-status.yaml` -- 3.2 done (feito), 3.3 in-progress.
- [x] `api/src/lots/lot-id.pipe.ts` + spec; `lots.controller.ts`, `lots.service.ts` -- pipe na imagem (commit `refactor` separado).
- [x] `api/src/lots/lot.entity.ts` + migration -- índice `lots_current_bid`.
- [x] `api/src/lots/dto/list-lots-query.dto.ts` + spec, `dto/lot-card.dto.ts`, `dto/lot-showcase.dto.ts`, `dto/lot-detail.dto.ts`.
- [x] `api/src/lots/lots.service.ts` + spec, `lots.controller.ts`, `lots.module.ts` -- os três endpoints.
- [x] `web/src/shared/api/types.ts` -- tipos novos.
- [x] `README.md` (Testes: vitrine e destaque; Comportamentos esperados: cancelado some da vitrine e o link dá 404), `docs/ai-log.md`.

**Acceptance Criteria:**
- Given os três endpoints, when se olha o log de queries, then cada um dispara o número fixo acima e nenhum toca `lot_images` nem a Cleveland.
- Given `GET /lots/featured`, when a rota é chamada, then ela não cai no handler de `:id`.

## Verification

**Commands:**
- `cd api && npm run lint:check && npm test -- --silent && npm run build` -- expected: verde.
- `cd web && npm run lint && npm run build` -- expected: verde.

**Manual checks:**
- Com compose: `migration:run`; `curl` em `/lots?status=live|scheduled|ended`, `?q=`, `?number=`, `/lots/featured` (204 com banco vazio), `/lots/1`, `/lots/abc` (404), conferindo as queries no log.

## Implementation Notes

- Filtro de status no `WHERE` como faixa (`starts_at <= :now AND :now < ends_at` etc.), para usar os índices; equivale ao `CASE` que gera a coluna `status`.
- Destaque com `findOne` em cadeia; os testes conferem as opções de ordem passadas ao repository falso. A ordem real no SQL fica para o e2e da 4.4 (`deferred-work.md`).
- `page` mantém o teto de 100 do catálogo, para o offset nunca estourar.
- Linhas da matriz sem teste automático (vitrine, busca, página vazia, detalhe): conferidas à mão com curl e `log_statement=all` (vitrine 2 queries, detalhe 1, destaque 1 a 3); o e2e entra na 4.4.
- Banco de rascunho `agora_story33` ficou no container `agora-postgres` (não apagado sem autorização).

## Spec Change Log

## Review Triage Log

| # | Achado (edge-case-hunter) | Veredito | Evidência / rota |
|---|---|---|---|
| 1 | itens e `counts` em duas queries podem divergir se um lote muda entre elas | low | real só numa janela de milissegundos (READ COMMITTED) e o próximo GET corrige; a correção exige transação ou window function. rejeitado: opcional, listado |
| 2 | `GET /lots/:id/image` ainda serve a imagem de lote cancelado | low | comportamento da 3.2, sem mudança aqui; a imagem é de acervo público e a linha do README fala do link do lote. rejeitado: opcional, listado |
| 3 | `number=1e3`, `0x10` ou ` 7 ` aceitos pelo `@Type(() => Number)` | low | confirmado: viram 1000, 16 e 7; o front (3.6) só manda dígitos, e o efeito é uma busca por outro número. rejeitado: opcional, listado |
