---
title: 'Criação de lote com snapshot e imagem'
type: 'feature'
created: '2026-10-26'
status: 'done'
baseline_commit: '950511f45e46ac0244cec812b1885fa11b44447c'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/stories/epic-3-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** o leiloeiro já encontra peças no acervo (3.1), mas não consegue colocá-las em leilão; as stories 3.3 a 5.x precisam da tabela `lots`, da imagem guardada e do `Clock`.

**Approach:** módulo `lots` com `POST /lots` (só leiloeiro): busca a peça por `CatalogService.find(id)`, baixa a imagem pelo `catalog`, e grava lote (snapshot + condições) e imagem numa transação. `GET /lots/:id/image` público serve os bytes do banco. Cria o `Clock` injetável em `common/`.

## Boundaries & Constraints

**Always:**
- Body só com `artworkId`, `startingBid`, `increment`, `startsAt`, `endsAt` (ISO 8601). Campo extra (título, descrição) é descartado pelo `whitelist` do pipe global, nunca gravado.
- Dados da peça só do `catalog` (D-038). Snapshot: `artwork_id`, `accession_number`, `title`, `artist`, `date`, `type`, `technique`, `measurements`, `description` (nulo), `department`.
- `lots`: `id`, `number` (sequência + `UNIQUE`, D-036), `auctioneer_id` (FK `users`, com índice, para a 3.4), snapshot, `starting_bid`, `increment`, `starts_at`, `ends_at`, `cancelled_at`, `settled_at`, `current_bid` (nulo), `bid_count` (0), `created_at`; índices em `starts_at` e `ends_at`; `CHECK` de `ends_at > starts_at`, valores positivos e `bid_count >= 0`.
- `lot_images`: `lot_id` (PK e FK), `content_type`, `bytes` (`bytea`).
- Regras de data numa função pura (`lot.rules.ts`) que recebe `now` do `Clock`: início antes de `now - 1 min` → `startsAt: 'notInPast'`; `endsAt <= startsAt` → `endsAt: 'afterStart'`. Saem como 400 `{ code: 'VALIDATION_FAILED', fields }`, o mesmo formato do pipe.
- Download da imagem no `catalog` (único que fala com a Cleveland/CDN): timeout de 5s, `content-type` só `image/jpeg`, `image/png` ou `image/webp` (SVG fora: seria servido do nosso domínio), até 5 MB contados nos bytes lidos (não só no `content-length`). Qualquer falha → 502 `IMAGE_DOWNLOAD_FAILED`.
- Download acontece antes da transação (nada de rede com transação aberta). Lote e imagem no mesmo `dataSource.transaction`, só com o `manager`.
- `GET /lots/:id/image`: público, devolve os bytes com o `content-type` salvo e `Cache-Control: public, max-age=31536000, immutable`; lote sem imagem/inexistente → 404. A query não carrega `lots`.
- Peça que `find` devolve `null` (inexistente ou de outro departamento) → 400 `VALIDATION_FAILED` com `fields.artworkId: 'notFound'`.
- Peça já em lote agendado ou ao vivo (não cancelado e `now < ends_at`) → 409 `ARTWORK_ALREADY_LISTED` (D-051), no CLAUDE.md e traduzido no front. Lote encerrado ou cancelado libera a peça. A checagem roda dentro da transação, depois de `pg_advisory_xact_lock(artwork_id)`, para duas criações simultâneas da mesma peça não passarem juntas; índice em `artwork_id`.
- Limites (centavos): `startingBid` de 100 a 1.000.000.000; `increment` de 100 a 100.000.000.
- Resposta 201: `{ id, number, title, artist, startingBid, increment, startsAt, endsAt }`, espelhada em `web/src/shared/api/types.ts`.

**Never:** endpoint de listagem, detalhe ou cancelamento (3.3/3.4); índice de `current_bid` (fica na 3.3, com o destaque); tela (3.5); dependência nova; `synchronize`; outro módulo chamando a Cleveland.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Criação ok | leiloeiro, peça válida, condições válidas | 201 com `number` sequencial; lote e imagem gravados | N/A |
| Valor inválido | `startingBid`/`increment` ≤ 0, não inteiro ou acima do teto | 400 `VALIDATION_FAILED` com o campo | pipe global |
| Datas inválidas | fim ≤ início; início > 1 min no passado | 400 `VALIDATION_FAILED` (`afterStart` / `notInPast`) | nada gravado |
| Início dentro da tolerância | início 30s no passado | 201 | N/A |
| Imagem ruim | download falha, timeout, `text/html`, > 5 MB | 502 `IMAGE_DOWNLOAD_FAILED` | nenhum lote criado |
| Cleveland fora | `find` lança | 503 `CATALOG_UNAVAILABLE` | nada gravado |
| Peça inexistente | `find` → `null` | 400 `VALIDATION_FAILED` `artworkId: 'notFound'` | nada gravado |
| Peça já listada | lote agendado/ao vivo da mesma peça | 409 `ARTWORK_ALREADY_LISTED` | lote cancelado ou encerrado não bloqueia |
| Papel errado | licitante / sem token | 403 `ROLE_NOT_ALLOWED` / 401 | guards existentes |
| Imagem do lote | `GET /lots/:id/image` | bytes + `content-type` + `Cache-Control` longo, sem chamar a Cleveland | 404 se não existe |

**Casos de teste (definidos pelo usuário):** `lot.rules.spec.ts`: (1) recusa início mais de 1 min no passado; (2) aceita início 30s no passado; (3) recusa fim igual ao início; (j) recusa peça em lote agendado ou ao vivo; (j) aceita peça de lote cancelado; (j) aceita peça de lote encerrado. Download da imagem com `fetch` falso: (4) recusa `content-type` que não é imagem; (5) recusa imagem acima de 5 MB mesmo sem `content-length`; (6) falha de rede vira `IMAGE_DOWNLOAD_FAILED`. `lots.service.spec.ts`: (7) falha da imagem não grava lote. `create-lot.dto.spec.ts`: (8) recusa `startingBid` zero; (9) recusa valor acima do teto.

</frozen-after-approval>

## Code Map

- `api/src/catalog/catalog.service.ts` -- `find(id)` → `ArtworkDetail | null` (já existe); acrescentar `image(url)` delegando ao client e mapeando falha para `IMAGE_DOWNLOAD_FAILED`.
- `api/src/catalog/cleveland.client.ts` -- padrão de `fetch` + `AbortSignal.timeout(5000)` + `body.cancel()`; acrescentar `download(url)` lendo o stream com limite de bytes.
- `api/src/catalog/catalog.module.ts` -- já exporta `CatalogService`.
- `api/src/common/domain.exception.ts`, `domain-exception.filter.ts` (+ spec) -- `IMAGE_DOWNLOAD_FAILED` → 502.
- `api/src/common/validation.pipe.ts` -- formato de `VALIDATION_FAILED`; reusar o mesmo shape no erro das regras de data.
- `api/src/common/auth.decorator.ts`, `current-user.decorator.ts` -- `@Auth('AUCTIONEER')` só no `POST`; o `GET` da imagem fica sem guard.
- `api/src/wallets/*` -- modelo de entity com `@Check`, service com `dataSource.transaction` e response DTO como classe + `to...()`.
- `api/src/database/migrations/` -- gerar com `npm run migration:generate -- src/database/migrations/Lots` e revisar.
- `api/src/app.module.ts` -- registrar `LotsModule`.

## Tasks & Acceptance

**Execution:**
- [x] `api/src/common/clock.ts` -- `Clock` injetável com `now(): Date`.
- [x] `api/src/common/domain.exception.ts`, `domain-exception.filter.ts` + spec -- novo código 502.
- [x] `api/src/catalog/cleveland.client.ts`, `catalog.service.ts` + specs -- download da imagem com as regras acima.
- [x] `api/src/lots/lot.entity.ts`, `lot-image.entity.ts` + migration -- tabelas, índices e `CHECK`.
- [x] `api/src/lots/lot.rules.ts` + spec -- regras de data e de peça já listada.
- [x] `api/src/lots/dto/create-lot.dto.ts` (+ spec), `dto/lot-response.dto.ts`.
- [x] `api/src/lots/lots.service.ts` (+ spec), `lots.controller.ts`, `lots.module.ts`; `app.module.ts`.
- [x] `web/src/shared/api/types.ts` -- `CreateLotRequest`, `CreatedLot`.
- [x] `README.md` (Testes; Comportamentos esperados: peça só em um lote ativo por vez), `docs/decisions.md` (D-051), `web/src/shared` (tradução de `ARTWORK_ALREADY_LISTED`), `docs/ai-log.md`, `docs/stories/sprint-status.yaml` (3.1 done, 3.2 in-progress).
- [x] `CLAUDE.md` -- `ARTWORK_ALREADY_LISTED` (409) na lista de códigos; em "Comportamento esperado do agente": antes de commitar, rodar `npm run lint:check` (o mesmo do CI), não `npm run lint`, que corrige sozinho e esconde erro de formatação.

**Acceptance Criteria:**
- Given o lote criado, when a Cleveland sai do ar, then `GET /lots/:id/image` continua respondendo.
- Given `POST /lots` e `GET /lots/:id/image`, when se olha o log de queries, then cada um dispara um número fixo de queries.

## Verification

**Commands:**
- `cd api && npm run lint:check && npm test -- --silent && npm run build` -- expected: verde.
- `cd web && npm run lint && npm test && npm run build` -- expected: verde.

**Manual checks:**
- Com compose: `migration:run`; `POST /lots` com token de leiloeiro (201, `number` 1, 2...), licitante (403); `GET /lots/1/image` com `curl -I` mostra `content-type` e `Cache-Control`.

## Implementation Notes

- "`description` (nulo)" no snapshot significa coluna anulável: grava `artwork.description` (de `did_you_know` ou `description`), nulo quando a Cleveland não traz.
- Tradução de `ARTWORK_ALREADY_LISTED` em `web/src/features/auctioneer/lot-errors.ts`, no padrão de `features/wallet/deposit.ts` (só a feature do leiloeiro usa); a tela é da 3.5.
- Além da spec: `X-Content-Type-Options: nosniff` na imagem; `download` só aceita `https://`; id inválido em `GET /lots/:id/image` dá 404 em vez de 500.
- A sequência de `number` pode pular um valor se o insert da imagem falhar depois do insert do lote (comportamento normal de sequência no Postgres).
- `POST /lots`: 6 queries (BEGIN, advisory lock, select, insert lote, insert imagem, COMMIT); `GET /lots/:id/image`: 1 query.
- Linhas da matriz sem teste automático (criação ok, papel errado, Cleveland fora, peça inexistente, imagem servida): conferidas à mão com curl; os casos de teste são os definidos pelo usuário, e o e2e entra com Testcontainers no épico 4.

## Spec Change Log

## Review Triage Log

| # | Achado (edge-case-hunter) | Veredito | Evidência / rota |
|---|---|---|---|
| 1 | início 30s no passado e fim 10s no passado passam | medium | `scheduleErrors` só compara fim com início; o lote nasce encerrado e libera a peça. patch: `endsAt: 'notInPast'` + teste |
| 2 | data ISO de semana/dia do ano vira `Invalid Date` | medium | confirmado: `isISO8601('2026-W44-1', { strict: true })` é `true` e o `Date` dá `NaN`; as comparações passam e o insert dá 500. patch: `isIso8601` + teste |
| 3 | data sem offset lida no fuso do servidor | low | o Render roda em UTC e o front manda `toISOString()`. rejeitado: opcional, listado |
| 4 | redirect do CDN burla o `https://` | low | a URL vem da Cleveland, não do cliente; exige o CDN comprometido. rejeitado: opcional, listado |
| 5 | chave de advisory lock sem namespace | low | ainda não há outro advisory lock no código. rejeitado: opcional, listado |
| 6 | `lotError` traduz só `ARTWORK_ALREADY_LISTED` | low | a tela que usa é da 3.5, que traduz os demais códigos. rejeitado: listado para a 3.5 |
