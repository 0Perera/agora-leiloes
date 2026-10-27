---
title: 'Cadeia de HMAC, selo e alias (TDD)'
type: 'feature'
created: '2026-10-27'
status: 'done'
baseline_commit: 'a9606852d9000b5ff6c5604ee126c7fb8913e33a'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/stories/epic-4-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** os lances ainda não têm como provar integridade: falta a função que encadeia cada lance por HMAC, o selo do lote que detecta remoção do final e o alias por lote que esconde o licitante.

**Approach:** funções puras em `api/src/audit/` (cadeia e selo em TDD, alias com teste depois), recebendo o segredo por parâmetro, e a env `BID_HMAC_SECRET` obrigatória com mínimo de 32 caracteres. A gravação no banco fica para a 4.3.

## Boundaries & Constraints

**Always:**
- Serialização canônica: `<prefixo>:` + campos em ordem fixa separados por `|`; data em `toISOString()` (UTC, milissegundos); valor inteiro. HMAC-SHA256 em hex.
- `bid:` cobre `lotId|seq|userId|amount|createdAt|prevHash`; `seal:` cobre `lotId|count|lastHash`; `alias:` cobre `userId|lotId`.
- Primeiro lance encadeia na constante `GENESIS`; lote sem lances sela com contagem 0 e `GENESIS`.
- Alias = `"Licitante "` + 6 primeiros caracteres em base32 (RFC 4648, `A-Z2-7`) do HMAC `alias:` (D-044).
- Casos 1 a 8 e 12 em TDD: commit `test(audit)` vermelho antes do `feat(audit)` (D-055). Casos 9 a 11 e 13: teste depois.
- `BID_HMAC_SECRET` no `.env.example`, no `docker-compose.yml` (valor de dev) e no `render.yaml` (`generateValue: true`).

**Never:**
- Nenhuma dependência nova (só `node:crypto`), nenhuma entidade, migration ou service nesta story.
- Não ler `process.env` nem `ConfigService` dentro de `audit/`: o segredo entra por parâmetro.

**Casos de teste aprovados:**

`describe('chain.hashBid')`:
1. gera o mesmo hash para o mesmo lance
2. muda o hash quando muda o campo (`it.each` sobre `lotId`, `seq`, `userId`, `amount`, `createdAt`, `prevHash`)
3. encadeia o primeiro lance com o hash genesis
4. muda o hash quando muda o segredo
5. não coincide com um selo de mesmo conteúdo (prefixo `bid:` vs `seal:`)
12. muda o hash quando dígitos passam de um campo para o vizinho (lotId 1 e seq 23 contra lotId 12 e seq 3)

`describe('chain.sealLot')`:
6. muda o selo quando muda a contagem de lances
7. muda o selo quando muda o último hash
8. selo de lote sem lances usa contagem zero e o hash genesis
17. selos de lotes diferentes sem lances não coincidem
18. muda o selo quando muda o lotId

`describe('alias.forLot')`:
9. gera o mesmo alias para o mesmo licitante no mesmo lote
10. gera aliases diferentes para o mesmo licitante em lotes diferentes
11. usa "Licitante " seguido de 6 caracteres em base32

`describe('validateEnv')`:
13. recusa BID_HMAC_SECRET ausente e curto (`it.each`)

**Pedidos do usuário:**
- `docs/deploy-notes.md`: o segredo nunca muda depois do seed (todas as assinaturas deixariam de bater e a auditoria acusaria todos os lotes); no dia da entrega, recriar o banco mantendo o segredo.
- `docs/stories/deferred-work.md`, para a 4.3: `created_at` do lance vem do `Clock` da aplicação, nunca do `now()` do banco (Postgres guarda microssegundos, o hash usa milissegundos; a verificação falharia em todo lance).
- O usuário cria a variável no Render antes do merge.

</frozen-after-approval>

## Code Map

- `api/src/lots/lot.rules.ts` / `lot.rules.spec.ts` -- modelo: funções puras exportadas, tipos ao lado, factories no spec.
- `api/src/config/env.validation.ts` -- `Env` ganha `BID_HMAC_SECRET` com `@MinLength(32)`, igual ao `JWT_SECRET`; `validateEnv` já não expõe valores. Sem spec hoje.
- `api/.env.example`, `docker-compose.yml:30`, `render.yaml:26` -- seguir o padrão do `JWT_SECRET`.
- `docs/deploy-notes.md` -- já cita o segredo em "Seed em produção" e no passo 5 do "Dia da entrega"; reforçar, não duplicar.
- `api/src/audit/` -- pasta nova prevista no CLAUDE.md.
- IDs de `users` e `lots` são `number`.

## Tasks & Acceptance

**Execution:**
- [x] `docs/stories/sprint-status.yaml` -- 4-1 `done` (feito), 4-2 `in-progress`
- [x] `api/src/audit/chain.spec.ts` + `chain.ts` -- ciclos vermelho/verde: `hashBid` (1-5, 12), depois `sealLot` (6-8); exporta `GENESIS`
- [x] `api/src/audit/alias.ts` + `alias.spec.ts` -- `forLot(secret, userId, lotId)` e casos 9-11
- [x] `api/src/config/env.validation.ts` + `env.validation.spec.ts` -- `BID_HMAC_SECRET` e caso 13
- [x] `api/.env.example`, `docker-compose.yml`, `render.yaml`, `api/.env` local (ignorado) -- nova env
- [x] `docs/deploy-notes.md`, `docs/stories/deferred-work.md` -- pedidos do usuário
- [x] `docs/ai-log.md` -- entrada da 4.2

**Acceptance Criteria:**
- Given o histórico da branch, when lido, then cada `test(audit)` vem antes do `feat(audit)` correspondente e fica vermelho sozinho.
- Given `audit/*.ts`, when inspecionado, then não importa Nest nem TypeORM e os specs não usam mock.
- Given a API sem `BID_HMAC_SECRET` ou com menos de 32 caracteres, when `validateEnv(Env, ...)` roda, then lança erro citando só o nome da variável.

## Design Notes

```ts
export const GENESIS = '0'.repeat(64);
hashBid(secret, { lotId, seq, userId, amount, createdAt, prevHash: string | null }): string
sealLot(secret, { lotId, count, lastHash: string | null }): string
forLot(secret, userId, lotId): string   // "Licitante K7QX2M"
```

`null` vira `GENESIS`, para o chamador não repetir a constante. O caso 5 monta um selo com `lotId` e `count = seq` e `lastHash` igual ao restante do payload do lance, então o conteúdo depois do prefixo é idêntico: só o prefixo separa. Base32 de 6 caracteres usa os 30 primeiros bits do HMAC (encoder de ~6 linhas no próprio `alias.ts`).

`render.yaml` com `generateValue: true` só gera valor quando a variável ainda não existe; com o valor criado à mão antes do merge, o sync não o substitui.

## Verification

**Commands:**
- `cd api && npx jest src/audit src/config --silent` -- expected: 13 casos verdes
- `cd api && npm run lint:check && npm test --silent && npm run build` -- expected: tudo verde

## Implementation Notes

- Dois pares `test(audit)` → `feat(audit)`: `hashBid` (1-4, 12) e `sealLot` (5-8). O caso 5 foi para o segundo par porque compara com `sealLot`.
- `sign(secret, prefix, fields)` exportado de `chain.ts` e reaproveitado por `alias.ts` (e pelo comprovante no épico 5).
- Depois da revisão: casos 14 (alias por licitante), 15 (hash com valor conhecido) e 16 (env válida e sem vazar o valor), aprovados pelo usuário; cópia do segredo fora do Render no `deploy-notes.md`; regra do genesis para a 5.5 no `deferred-work.md`.
- Correção pedida pelo usuário antes do merge: `lotId` no selo (sem ele, lotes vazios tinham selos iguais). `sealLot` passou a receber `{ lotId, count, lastHash }`, para os casos 17 e 18 ficarem vermelhos pelo motivo certo no commit `test` (o Jest não checa tipos, e com argumentos posicionais eles passavam por acaso). D-056 atualizada.
- `env.validation.spec.ts` importa `reflect-metadata` por causa dos decorators do class-validator.

## Spec Change Log

## Review Triage Log

| # | Achado | Veredito | Evidência |
|---|---|---|---|
| 1 | `createdAt` inválido lança `RangeError` | false | falha ruidosa em estado que nenhum chamador produz; comportamento correto |
| 2 | `amount`/ids não inteiros são assinados | low | colunas `integer` e DTO garantem inteiro; guarda acrescentaria ramo sem caso real (rejeitado) |
| 3 | `prevHash` null aceito em `seq > 1` | low | a verificação da 5.5 compara `prev_hash` com o hash do lance anterior e acusa a quebra; registrado para a 5.5 |
| 4 | `sign()` sem guarda para `|` em campo string e prefixo livre | low | hoje só números, ISO e hex; prefixo como union é opcional (listado) |
| 5 | selo aceita estado impossível (contagem negativa etc.) | low | chamador é o service da 4.3; rejeitado |
| 6 | colisão de alias no mesmo lote | false | risco aceito na D-044 (30 bits) |
| 7 | segredo só de espaços ou igual ao JWT passa | low | configuração do próprio operador; rejeitado |
| 8 | alias não testa licitantes diferentes no mesmo lote | medium | `sign(secret,'alias',[lotId])` passaria nos casos 9-11; caso novo depende do usuário |
| 9 | env sem controle positivo e sem checar que o valor não vaza | medium | AC "cita só o nome" não tem teste; caso novo depende do usuário |
| 10 | serialização sem teste de resposta conhecida | medium | reordenar campos ou trocar separador deixa 1-8 e 12 verdes; caso novo depende do usuário |
| 11 | Tasks diz `hashBid (1-5, 12)` e as notas dizem (1-4, 12) | false | Implementation Notes registram o desvio; correção seria editar a spec |
| 12 | sprint-status `in-progress` com spec `in-review` | false | o passo seguinte do fluxo sincroniza o status |
| 13 | falta `verify` com `timingSafeEqual` | false | as comparações da 5.5 são entre valores guardados no servidor, sem MAC vindo do atacante |
| 14 | segredo sem cópia fora do Render | low | recriar o serviço geraria outro valor; patch de uma linha no deploy-notes |
| 15 | formato da serialização fora do `decisions.md` | low | formato já definido nas notas aprovadas da story no `epics.md`; opcional (listado) |
| 16 | README sem a env nova | false | "Rodar local" usa `cp .env.example`, que já traz a env |
| 17 | Code Map cita o passo 5 e o diff mexe no passo 1 | false | o passo 5 já citava o segredo; o 1 só reforça |
