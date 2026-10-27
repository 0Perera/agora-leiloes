---
title: 'Cadeia de HMAC, selo e alias (TDD)'
type: 'feature'
created: '2026-10-27'
status: 'in-progress'
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
- `bid:` cobre `lotId|seq|userId|amount|createdAt|prevHash`; `seal:` cobre `count|lastHash`; `alias:` cobre `userId|lotId`.
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
- [ ] `docs/stories/sprint-status.yaml` -- 4-1 `done` (feito), 4-2 `in-progress`
- [ ] `api/src/audit/chain.spec.ts` + `chain.ts` -- ciclos vermelho/verde: `hashBid` (1-5, 12), depois `sealLot` (6-8); exporta `GENESIS`
- [ ] `api/src/audit/alias.ts` + `alias.spec.ts` -- `forLot(secret, userId, lotId)` e casos 9-11
- [ ] `api/src/config/env.validation.ts` + `env.validation.spec.ts` -- `BID_HMAC_SECRET` e caso 13
- [ ] `api/.env.example`, `docker-compose.yml`, `render.yaml`, `api/.env` local (ignorado) -- nova env
- [ ] `docs/deploy-notes.md`, `docs/stories/deferred-work.md` -- pedidos do usuário
- [ ] `docs/ai-log.md` -- entrada da 4.2

**Acceptance Criteria:**
- Given o histórico da branch, when lido, then cada `test(audit)` vem antes do `feat(audit)` correspondente e fica vermelho sozinho.
- Given `audit/*.ts`, when inspecionado, then não importa Nest nem TypeORM e os specs não usam mock.
- Given a API sem `BID_HMAC_SECRET` ou com menos de 32 caracteres, when `validateEnv(Env, ...)` roda, then lança erro citando só o nome da variável.

## Design Notes

```ts
export const GENESIS = '0'.repeat(64);
hashBid(secret, { lotId, seq, userId, amount, createdAt, prevHash: string | null }): string
sealLot(secret, count: number, lastHash: string | null): string
forLot(secret, userId, lotId): string   // "Licitante K7QX2M"
```

`null` vira `GENESIS`, para o chamador não repetir a constante. O caso 5 monta um selo com `count = lotId` e `lastHash` igual ao restante do payload do lance, então o conteúdo depois do prefixo é idêntico: só o prefixo separa. Base32 de 6 caracteres usa os 30 primeiros bits do HMAC (encoder de ~6 linhas no próprio `alias.ts`).

`render.yaml` com `generateValue: true` só gera valor quando a variável ainda não existe; com o valor criado à mão antes do merge, o sync não o substitui.

## Verification

**Commands:**
- `cd api && npx jest src/audit src/config --silent` -- expected: 13 casos verdes
- `cd api && npm run lint:check && npm test --silent && npm run build` -- expected: tudo verde

## Implementation Notes

## Spec Change Log

## Review Triage Log
