---
title: 'Busca no acervo da Cleveland'
type: 'feature'
created: '2026-10-26'
status: 'done'
baseline_commit: '3dacb81778c46e00ec36e49ce806561a2c95d6ae'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/stories/epic-3-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** o leiloeiro ainda não tem como encontrar peças do acervo da Cleveland para montar lotes, e a criação de lote (3.2) precisa de uma busca por id confiável.

**Approach:** módulo `catalog`, o único que chama a Cleveland (`fetch` nativo, timeout de 5s, `limit` e `fields` explícitos, só peças com imagem), com mapeamento puro da peça, cache em memória com TTL e `GET /catalog/search` só para leiloeiro. Também expõe `CatalogService.find(id)` para a 3.2.

## Boundaries & Constraints

**Always:**
- Busca recebe `department` validado, com duas opções: `European Painting and Sculpture` (padrão) e `Greek and Roman Art`; fora da lista → 400 `VALIDATION_FAILED`. Uma chamada à Cleveland por busca, sem juntar resultados (D-050). A Cleveland não aceita dois departamentos na mesma chamada (vírgula, `|` e `;` dão 0; parâmetro repetido usa só o último; `department[]` é ignorado).
- `find(id)` aceita peça de qualquer um dos dois departamentos; peça de outro departamento → `null`.
- Artista = `creators[0].description`; sem ele, `culture[0]` (`culture` é lista; lista vazia conta como ausente); sem os dois, `''`. Imagem = `images.web.url`.
- Peça sem `id`, `title` ou imagem é descartada no mapeamento (a resposta da Cleveland é `unknown` validado, sem `any`).
- Falha de rede, timeout (`AbortSignal.timeout(5000)`), status ≠ 2xx ou JSON inválido → `DomainException('CATALOG_UNAVAILABLE')` → 503. Falha nunca entra no cache. `find(id)` devolve `null` quando a Cleveland responde 404.
- Cache só da busca, chave `department` + `q` normalizado (trim + minúsculas) + `page`, TTL de 10 min, no máximo 500 entradas (descarta a mais antiga). A hora vem de uma função `now` injetada, para o teste controlar.
- Nova env `CLEVELAND_API_URL` validada (`IsUrl`) e presente em `.env.example`, `docker-compose.yml` e `render.yaml`.
- Tipos da resposta espelhados em `web/src/shared/api/types.ts` (mudança de contrato).

**Never:** tela do seletor de departamento (fica na 3.5); nenhuma dependência nova (`@nestjs/cache-manager`, axios); nenhum outro módulo chama a Cleveland; sem migration, tabela ou tela nesta story; `find(id)` sem cache.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Busca ok | leiloeiro, `q=portrait&page=1` (sem `department`) | 200 `{ items, page, pageSize: 12, total }` em European Painting and Sculpture; item `{ id, title, artist, date, type, technique, imageUrl }` | N/A |
| Outro departamento | `department=Greek and Roman Art` | uma chamada à Cleveland com esse departamento | N/A |
| Departamento inválido | `department=Prints` | 400 `VALIDATION_FAILED` com `fields.department` | pipe global existente |
| Sem resultado | termo sem peças | 200 com `items: []`, `total: 0` | N/A |
| Busca repetida no TTL | mesmo `q` (outra caixa/espaços) e `page` | resposta do cache, sem chamar a Cleveland | N/A |
| Query inválida | `q` vazio/>100 chars, `page` <1, >100 ou não inteiro | 400 `VALIDATION_FAILED` com `fields` | pipe global existente |
| Cleveland fora/lenta/erro | rede cai, >5s, 5xx, JSON inválido | 503 `{ code: 'CATALOG_UNAVAILABLE' }` | não cacheia; outras requisições seguem |
| Papel errado | licitante / sem token | 403 / 401 | guards existentes |

**Casos de teste (definidos pelo usuário, sem extras):** `artwork.mapper.spec.ts`: (1) artista vem de `creators[0].description`; (2) sem `creators`, artista vem de `culture`; (3) sem os dois, artista vazio; (4) descarta peça sem imagem; (9) `culture` em lista usa o primeiro item (`["France, 17th century"]` → `"France, 17th century"`) e lista vazia conta como ausente. `catalog.service.spec.ts` (client falso): (5) busca repetida no TTL sai do cache; (6) depois do TTL chama a Cleveland de novo; (7) falha do client vira `CATALOG_UNAVAILABLE`; (8) falha não entra no cache. `dto/search-query.dto.spec.ts`: (10) recusa departamento fora da lista.

</frozen-after-approval>

## Code Map

- `api/src/common/domain.exception.ts`, `domain-exception.filter.ts` (+ spec) -- incluir `CATALOG_UNAVAILABLE` → 503.
- `api/src/common/auth.decorator.ts` -- `@Auth('AUCTIONEER')` dá 401/403; reusar como em `wallets.controller.ts`.
- `api/src/common/validation.pipe.ts` -- pipe global de `VALIDATION_FAILED`; conferir que transforma query (`page` string → número).
- `api/src/config/env.validation.ts` -- classe `Env`; acrescentar `CLEVELAND_API_URL`.
- `api/src/app.module.ts` -- registrar `CatalogModule`.
- `api/src/wallets/dto/wallet-response.dto.ts` -- modelo de response DTO como classe + função `to...`.
- `api/src/auth/auth.service.spec.ts` -- modelo de fake em memória (classe) e factory `make...()`.
- Cleveland real: `GET {url}/artworks/?q&limit&skip&has_image=1&fields=...` devolve `{ info: { total }, data: [...] }`; `GET {url}/artworks/{id}?fields=...` devolve `{ data }` ou 404. `culture` é array.

## Tasks & Acceptance

**Execution:**
- [x] `api/src/config/env.validation.ts`, `api/.env.example`, `docker-compose.yml`, `render.yaml` -- `CLEVELAND_API_URL=https://openaccess-api.clevelandart.org/api`.
- [x] `api/src/common/domain.exception.ts`, `domain-exception.filter.ts` -- novo código 503.
- [x] `api/src/catalog/cleveland.client.ts` -- `search(q, limit, skip)` e `find(id)` com timeout, `fields` explícitos e `has_image=1`; devolve `unknown`; lança `CATALOG_UNAVAILABLE`.
- [x] `api/src/catalog/artwork.mapper.ts` + spec -- mapeamento puro de `unknown` para `Artwork` (resumo) e `ArtworkDetail` (+ `accessionNumber`, `measurements`, `description` de `did_you_know` ou `description`).
- [x] `api/src/catalog/search.cache.ts` -- cache TTL com `now` injetado e limite de entradas.
- [x] `api/src/catalog/catalog.service.ts` + spec -- `search(q, page)` com cache e `find(id)`.
- [x] `api/src/catalog/catalog.controller.ts`, `dto/search-query.dto.ts`, `dto/artwork-response.dto.ts`, `dto/search-response.dto.ts`, `catalog.module.ts` (exporta o service).
- [x] `web/src/shared/api/types.ts` -- `Artwork` e `CatalogSearch`.
- [x] `docs/decisions.md` -- D-050: a Cleveland não aceita dois departamentos na mesma chamada, então o leiloeiro escolhe o departamento na busca (European Painting and Sculpture, padrão, ou Greek and Roman Art). Alternativas: acervo inteiro; duas chamadas juntando resultados.
- [x] `README.md` -- em "Comportamentos esperados": a busca no acervo mostra só pintura e escultura europeia ou arte grega e romana (tema da casa), e só peças com imagem; linha em Testes.
- [x] `docs/ai-log.md`, `docs/stories/sprint-status.yaml` (2.4 done, 3.1 in-progress).

**Acceptance Criteria:**
- Given o `CatalogService`, when a 3.2 chamar `find(id)`, then recebe `ArtworkDetail` ou `null`, com o mesmo timeout de 5s.
- Given o código da API, when se procura `clevelandart`, then só `catalog/` e a config aparecem.

## Verification

**Commands:**
- `cd api && npm run lint:check && npm test -- --silent && npm run build` -- expected: tudo verde.
- `cd web && npm run lint && npm test && npm run build` -- expected: verde (só tipos mudaram).

**Manual checks:**
- Com a API no ar: `curl` de `/catalog/search?q=portrait` com token de leiloeiro (200), de licitante (403), sem token (401); segunda chamada sem query nova no log; `CLEVELAND_API_URL` apontando para porta fechada → 503.

## Implementation Notes

## Spec Change Log

## Review Triage Log

| # | Achado (edge-case-hunter) | Veredito | Evidência / rota |
|---|---|---|---|
| 1 | `CLEVELAND_API_URL` sem protocolo passa no `IsUrl` | medium | `IsUrl` aceita host sem esquema por padrão; o `fetch` falha e toda busca dá 503. patch |
| 2 | corpo de 404/não-2xx não consumido em `get()` | medium | o undici segura a conexão até o GC; erros repetidos esgotam o pool. patch |
| 3 | `find` com 2xx sem `data` vira `null` | medium | `find` devolve `undefined`, o mapper dá `null` e a 3.2 diria "peça inexistente" durante uma falha; a spec manda 503 para resposta inválida. patch (agrupado com 8) |
| 4 | buscas idênticas simultâneas chamam a Cleveland duas vezes | low | real só em rajada; a correção acrescenta um mapa de promessas pendentes. rejeitado (complexidade, uso raro) |
| 5 | espaços internos repetidos geram outra chave de cache | low | só custa uma chamada extra. rejeitado: opcional, listado |
| 6 | `total` conta peças que o mapper descarta | low | com `has_image=1`, quase toda peça tem título e imagem. rejeitado: raro |
| 7 | `deploy-notes.md` sem `CLEVELAND_API_URL` | medium | a lista manual de envs da API no Render não tem a variável, e o boot falha. patch |
| 8 | `find` contradiz a spec (resposta inválida → 503) | medium | mesma causa do 3. patch |
