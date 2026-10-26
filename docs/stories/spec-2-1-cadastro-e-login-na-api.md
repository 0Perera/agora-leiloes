---
title: 'Story 2.1: Cadastro e login na API'
type: 'feature'
created: '2026-10-25'
status: 'done'
baseline_commit: '6cfd066927d0c587ebbd933dac84cbae1d97e728'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/CLAUDE.md'
  - '{project-root}/docs/stories/epic-2-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** a API não tem usuários nem autenticação; nenhuma story seguinte consegue proteger rota ou saber o papel de quem chama.

**Approach:** módulos `users` e `auth` com `POST /auth/signup`, `POST /auth/login` e `GET /auth/me`; senha com `scrypt` nativo, JWT de 8h via `@nestjs/jwt` com guard à mão (D-040); em `common/`, exceção de domínio com código, exception filter, guards de autenticação e de papel e o formato `VALIDATION_FAILED`, que as próximas stories reusam.

## Boundaries & Constraints

**Always:**
- Resposta de signup e login: `{ token, user: { id, name, email, role } }`; signup 201, login 200. `GET /auth/me` devolve `{ id, name, email, role }` lido do banco.
- JWT com `sub` (id em string) e `role`, `expiresIn: '8h'`, segredo em `JWT_SECRET` (validado no boot, mínimo 32 caracteres).
- E-mail normalizado (`trim` + minúsculas) no `AuthService` antes de salvar e de buscar; `UNIQUE` e `CHECK (email = lower(email))` no banco. O cadastro confere a existência antes de inserir, e violação de unique (`23505`) também vira `EMAIL_TAKEN` (cadastro simultâneo).
- Senha com 8 a 128 caracteres. `id` de usuário `integer` autoincremento (D-046, por simplicidade).
- Login com e-mail inexistente roda `scrypt` contra um hash fictício, para o tempo de resposta não revelar se o e-mail existe.
- Recusa de domínio sai como `{ code }`; DTO inválido como `{ code: 'VALIDATION_FAILED', fields: { campo: regra } }`, com a primeira regra violada de cada campo (nome da constraint do `class-validator`, ex.: `isEmail`).
- Logger do TypeORM sem parâmetros de query: query com erro não pode vazar e-mail nem hash no log.

**Never:**
- Carteira (story 2.2), Testcontainers/e2e, rota de troca de papel, refresh token, `passport`, dependência além de `@nestjs/jwt`.
- Logar senha, token, e-mail ou corpo de requisição.

## I/O & Edge-Case Matrix

| Cenário | Entrada / Estado | Esperado |
|---|---|---|
| Cadastro ok | nome, `Ana@x.com`, senha de 8 a 128, `BIDDER` | 201, e-mail salvo `ana@x.com`, hash `scrypt$16384$8$1$<salt>$<hash>` |
| E-mail repetido | `ANA@x.com` com `ana@x.com` já salvo | 409 `{ code: 'EMAIL_TAKEN' }` |
| Campo inválido | e-mail malformado, senha < 8, papel `ADMIN` | 400 `VALIDATION_FAILED` com os três campos; nada gravado |
| Login ok | cadastro com `Ana@x.com`, login com `ana@x.com` | 200, token com `sub`, `role`, `exp = iat + 8h` |
| Login recusado | e-mail inexistente ou senha errada | 401 `{ code: 'INVALID_CREDENTIALS' }`, idêntico nos dois |
| Sem token / expirado / adulterado | `GET /auth/me` | 401 (`UnauthorizedException` padrão do Nest) |
| Papel errado | rota com `@Auth('AUCTIONEER')` chamada por `BIDDER` | 403 `{ code: 'ROLE_NOT_ALLOWED' }` |


**Testes unitários aprovados:**
- `password`: aceita a senha certa; recusa a senha errada; gera hashes diferentes para a mesma senha.
- `DomainExceptionFilter.catch`: `{ code }` com 409, 401 e 403 para `EMAIL_TAKEN`, `INVALID_CREDENTIALS`, `ROLE_NOT_ALLOWED` (`it.each`).
- `validationPipe`: `VALIDATION_FAILED` com a primeira regra violada de cada campo.
- `AuthGuard.canActivate`: recusa sem token; recusa token inválido; anexa `{ id, role }` com token válido.
- `RolesGuard.canActivate`: libera o papel exigido; recusa outro papel com `ROLE_NOT_ALLOWED`; libera rota sem papel.
- `AuthService` (com `UsersService` falso em memória, sem mock de repository): login com `ana@x.com` funciona após cadastro com `Ana@x.com`; cadastro com `ANA@x.com` após `ana@x.com` dá `EMAIL_TAKEN`.
- Fluxo HTTP conferido à mão com `curl`; e2e entra com o Testcontainers no épico 4.

</frozen-after-approval>

## Code Map

- `api/src/main.ts` -- trocar `ValidationPipe` pelo `validationPipe()` de `common/` e registrar `DomainExceptionFilter` global.
- `api/src/app.module.ts` -- importar `UsersModule` e `AuthModule`.
- `api/src/config/env.validation.ts` -- `Env` ganha `JWT_SECRET`. Seguir o padrão de mensagem sem valor.
- `api/src/database/database.options.ts` -- usar o logger novo; entidades já carregadas por glob `*.entity`.
- `api/src/database/migrations/` -- `Init` é vazia; gerar a nova com `npm run migration:generate` contra o compose (`docker compose up -d db`). Não editar `Init`.
- `api/src/health/` -- referência de estilo de controller, DTO-classe e spec.
- `api/.env.example`, `render.yaml` (`generateValue: true`), `docker-compose.yml` (valor de dev) -- nova `JWT_SECRET`.

## Tasks & Acceptance

**Execution:**
- [x] `api/package.json` -- `npm i @nestjs/jwt` (peer aceita Nest 11, conferido) -- D-040.
- [x] `api/src/config/env.validation.ts`, `api/.env.example`, `render.yaml`, `docker-compose.yml` -- `JWT_SECRET`.
- [x] `api/src/database/safe.logger.ts` + `database.options.ts` -- subclasse de `AdvancedConsoleLogger` que descarta `parameters`.
- [x] `api/src/common/domain.exception.ts` -- `DomainException(code)` com união de códigos; `domain-exception.filter.ts` (+ spec) mapeia código → status.
- [x] `api/src/common/validation.pipe.ts` (+ spec) -- `ValidationPipe` com `whitelist`, `transform` e `exceptionFactory` no formato `VALIDATION_FAILED`.
- [x] `api/src/common/auth.guard.ts`, `roles.guard.ts` (+ specs), `auth.decorator.ts` (`@Auth(...roles)` aplica os dois guards), `current-user.decorator.ts`.
- [x] `api/src/users/` -- `user.entity.ts` (`role` enum `AUCTIONEER|BIDDER`, `password_hash`, `created_at timestamptz`), `users.module.ts`, `users.service.ts` (`create`, `findByEmail`, `findById`, com `select` só do necessário).
- [x] `api/src/database/migrations/<ts>-Users.ts` -- gerada pelo CLI e revisada; mesmo commit da entidade.
- [x] `api/src/auth/` -- `password.ts` (+ spec), `auth.service.ts` (+ spec; `signup`, `login`, `me`), `auth.controller.ts`, `auth.module.ts` (`JwtModule` global), `dto/signup.dto.ts`, `dto/login.dto.ts`, `dto/auth-response.dto.ts`, `dto/user-response.dto.ts`.
- [x] `docs/ai-log.md` -- entrada da story 2.1; `docs/decisions.md` -- D-046 (id `integer`: simplicidade; `gen_random_uuid()` é nativo no PG 17, então não é questão de extensão).

**Acceptance Criteria:**
- Given o banco migrado, when inspeciono `users`, then há `UNIQUE (email)` e `CHECK` de minúsculas, e o hash nunca contém a senha em claro.
- Given qualquer requisição de auth, when olho o log da API, then não aparece senha, token, e-mail nem hash.
- Given `lint:check`, `test` e `build`, when rodo, then os três passam.

## Implementation Notes

- `@nestjs/jwt` fixado em `^11.0.2`: o 12 é só ESM e quebra o Jest (D-032).
- `validationPipe` sem `stopAtFirstError` (com ele a regra devolvida era a última escrita); pega a última chave de `constraints`, que é a primeira regra violada na ordem do DTO.
- Limites extras: nome até 100, e-mail até 254, senha do login até 128. `GET /auth/me` dá 401 se o usuário não existe mais.
- Matrix audit: dois casos a mais no `AuthService` (senha errada e e-mail inexistente dão `INVALID_CREDENTIALS`), para cobrir a linha "Login recusado". Linhas HTTP conferidas com `curl` (inclusive 6 cadastros simultâneos: um 201, cinco 409, log sem parâmetros).
- `JWT_SECRET` acrescentada ao `api/.env` local (ignorado pelo git).

## Spec Change Log

## Review Triage Log

Passada 1 (3 camadas). Patches aplicados pelo subagente de implementação e verificados (lint, 25 testes, build); adiamentos em `deferred-work.md`.

| Achado | Veredito | Rota / evidência |
|---|---|---|
| `QueryFailedError` não-unique cai no `ExceptionsHandler`, que loga `parameters` (e-mail, hash) | medium | patch: confirmado com `ConsoleLogger().error(new QueryFailedError(...))`, o e-mail aparece. Corrigir (ex.: filter que loga só a mensagem) + spec |
| `verifyPassword` aceita qualquer senha se o hash decodifica para 0 bytes | low | patch: `if (expected.length === 0) return false` |
| `RolesGuard` sem teste para `[]` (o que `@Auth()` grava) | medium | patch: o caso "libera rota sem papel" deve passar `[]` |
| Token do `AuthService` nunca passa pelo `AuthGuard` em teste | medium | patch: caso que decodifica o token (`sub`, `role`) |
| Login com e-mail em maiúsculas sem teste | medium | patch: caso de login com `ANA@x.com` |
| `SafeLogger` sem teste | medium | patch: `safe.logger.spec.ts` |
| `me` de usuário inexistente sem teste | low | patch: caso que dá 401 |
| Nome só com espaços passa; `trim` do e-mail nunca age (o `@IsEmail` recusa antes) | low | patch: `@Transform` de trim em `name` e `email` nos DTOs |
| Esquema `bearer` em minúsculas recusado | low | patch: comparação sem distinguir caixa |
| `describe('AuthService')` mistura métodos | low | patch: `AuthService.signup` / `AuthService.login` / `AuthService.me` |
| ai-log: troca do jwt 12→11 listada em "O que revisei" | low | patch: mover para "O que a IA gerou" e pedir ao usuário para revisar a seção |
| Expiração de 8h, `23505`→`EMAIL_TAKEN`, filter/pipe globais sem teste HTTP | medium | defer: e2e com Testcontainers (épico 4), conforme a intenção |
| Login sem limite de tentativas | medium | defer: fora da story; candidato a "Fora do escopo" |
| `@Auth` em classe + `@Auth()` no método ignora papel | low | rejeitado: não acontece hoje e a correção acrescenta ramo |
| `@CurrentUser` sem `@Auth` → 500 | low | rejeitado: uso indevido, a correção acrescenta guarda |
| `sub` NaN / papel inválido no token | false | só tokens assinados com o nosso segredo, sempre com `sub` numérico |
| E-mail Unicode (JS `toLowerCase` ≠ PG `lower`), tamanho após normalizar | low | rejeitado: raro, a correção acrescenta regra |
| N/r/p corrompidos → 500; `dummyHash` rejeitando | false | só se o hash for gravado por fora; parâmetros fixos |
| Erros aninhados no `toFields`; ordem das constraints | false | sem DTO aninhado; a ordem tem teste |
| Formato de 401 diferente de `{ code }` | false | decidido na intenção |
| README não atualizado | false | `cp .env.example` já traz a `JWT_SECRET` |
| D-046 sem decisão do usuário / formato | false | o usuário decidiu; o formato segue o modelo do topo |
| Log de `query` em dev ausente | false | já era assim antes desta story |

## Verification

**Commands:**
- `cd api && npm run lint:check && npm test && npm run build` -- tudo verde.
- `docker compose up -d db && cd api && npm run migration:run` -- migration aplica sem erro.

**Manual checks:**
- `curl` em signup (201, 409, 400), login (200, 401 nos dois casos com corpo idêntico) e `/auth/me` (200, 401 sem token); decodificar o JWT e conferir `exp - iat = 28800`.
