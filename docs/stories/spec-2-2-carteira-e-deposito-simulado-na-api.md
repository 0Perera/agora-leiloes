---
title: 'Story 2.2: Carteira e depósito simulado na API'
type: 'feature'
created: '2026-10-25'
status: 'done'
baseline_commit: '1a08e03f596638e7b86faf05e9c40658468ead5a'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/CLAUDE.md'
  - '{project-root}/docs/stories/epic-2-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** o licitante não tem saldo; sem carteira não há como dar lance (épico 4) nem creditar o leiloeiro na liquidação (épico 5).

**Approach:** módulo `wallets` com a entidade `Wallet` (uma por usuário, criada na transação do cadastro), `GET /wallet` e `POST /wallet/deposits` só para `BIDDER`. Limites do depósito no DTO; teto do `integer` conferido numa regra pura, dentro da transação com `FOR UPDATE`.

## Boundaries & Constraints

**Always:**
- `wallets`: `id` `integer` autoincremento (a ordem de lock do épico 4 é por `id`), `user_id` FK para `users` com `UNIQUE`, `balance` e `committed` `integer NOT NULL DEFAULT 0`, `@Check('wallets_balance', 'balance >= committed AND committed >= 0')`.
- Migration gerada pelo CLI e revisada; acrescentar à mão o `INSERT INTO wallets (user_id) SELECT id FROM users` para as contas que já existem. Mesmo commit da entidade.
- Cadastro: `users` e `wallets` gravados no mesmo `dataSource.transaction`, só com o `manager`. O tratamento do `23505` → `EMAIL_TAKEN` continua valendo.
- `GET /wallet` e `POST /wallet/deposits` com `@Auth('BIDDER')`; leiloeiro recebe 403 `ROLE_NOT_ALLOWED` pelo guard que já existe.
- Resposta das duas rotas: `WalletResponseDto { balance, committed, available }`, em centavos, `available = balance − committed`. `POST` devolve 201.
- `GET /wallet`: uma query, `select` só de `balance` e `committed`, `where: { userId }`.
- Depósito: `DepositDto { amount }` com `@IsInt`, `@Min(100)`, `@Max(10_000_000)` → `VALIDATION_FAILED`. Dentro da transação: `findOne` com `lock: { mode: 'pessimistic_write' }` pela carteira do usuário, regra pura `deposit(balance, amount)` em `wallet.rules.ts` recusa se o resultado passar de `2_147_483_647`, depois grava o novo `balance`. Passar do teto lança `DomainException('BALANCE_LIMIT_EXCEEDED')`, mapeado para **422** (mesmo padrão das recusas de lance, D-043); o código entra na lista do `CLAUDE.md`.
- Depósito não altera `committed`: só `balance` muda, então `available` sobe exatamente o valor depositado.

**Never:**
- Tabela de movimentações/extrato, saque, depósito pelo leiloeiro, alteração de `committed` (épico 4), crédito de liquidação (épico 5), dependência nova, e2e com Testcontainers (épico 4).

## I/O & Edge-Case Matrix

| Cenário | Entrada / Estado | Esperado | Erro |
|---|---|---|---|
| Cadastro | signup de `BIDDER` ou `AUCTIONEER` | carteira `0/0` criada junto | falha na carteira desfaz o usuário |
| Ver carteira | `BIDDER`, saldo 5000, comprometido 1500 | 200 `{ balance: 5000, committed: 1500, available: 3500 }` | — |
| Depósito ok | `{ amount: 10000 }` com saldo 5000 | 201 `{ balance: 15000, ... }` | — |
| Comprometido | `committed` 50000, depósito 10000 | `committed` continua 50000, `available` sobe 10000 | — |
| Limites | `amount` 99, 10_000_001, 150.5, `"100"` | 400 `VALIDATION_FAILED` `{ amount: <regra> }` | saldo não muda |
| Teto | saldo 2_140_000_000 + 10_000_000 | 422 `{ code: 'BALANCE_LIMIT_EXCEEDED' }` | saldo não muda |
| Papel | `AUCTIONEER` em qualquer rota de carteira | 403 `{ code: 'ROLE_NOT_ALLOWED' }` | — |
| Sem token | qualquer rota de carteira | 401 | — |

**Testes unitários aprovados:**
- `deposit` (`wallet.rules.spec.ts`): soma o valor ao saldo; aceita saldo exatamente no teto; recusa saldo acima do teto (`BALANCE_LIMIT_EXCEEDED`); não altera o comprometido (com 50000 comprometidos, depositar 10000 aumenta o disponível em 10000 e o comprometido continua 50000).
- `DepositDto` pelo `validationPipe`: aceita 100 e 10_000_000; recusa 99; recusa 10_000_001; recusa valor não inteiro (`it.each`).
- `toWalletResponse`: calcula `available` como `balance − committed`.
- `DomainExceptionFilter.catch`: `BALANCE_LIMIT_EXCEEDED` → 422 no `it.each`.
- Transação do cadastro, 403, 401, `FOR UPDATE` e "uma query só": conferidos à mão com `curl` e log de query; e2e no épico 4.

</frozen-after-approval>

## Code Map

- `api/src/users/users.service.ts` -- `create` passa a usar `DataSource.transaction`: `manager.getRepository(User).save(...)` e `WalletsService.open(manager, userId)`. Manter `isUniqueViolation` e o retorno `PublicUser`.
- `api/src/users/users.module.ts` -- importa `WalletsModule` (sem ciclo: `wallets` não importa `users`; só a classe `User` na relação).
- `api/src/auth/auth.service.spec.ts` -- usa `UsersService` falso em memória; não muda.
- `api/src/common/auth.decorator.ts`, `current-user.decorator.ts`, `auth.guard.ts` (`AuthUser { id, role }`) -- reusar como em `auth.controller.ts`.
- `api/src/common/domain.exception.ts` + `domain-exception.filter.ts` -- acrescentar `BALANCE_LIMIT_EXCEEDED` → 422 (`HttpStatus.UNPROCESSABLE_ENTITY`) e o caso no spec do filter.
- `api/src/common/validation.pipe.spec.ts` -- modelo para testar o `DepositDto`.
- `api/src/database/database.options.ts` -- entidades por glob; logger sem `query`. Para conferir "uma query só", ligar `'query'` temporariamente sem commitar (o `SafeLogger` já descarta parâmetros).
- `CLAUDE.md` -- somente leitura; o orquestrador já acrescentou `BALANCE_LIMIT_EXCEEDED` (422) na lista de códigos. Não editar.
- `api/src/database/migrations/1792974876623-Users.ts` -- não editar; gerar a nova com `npm run migration:generate` contra `docker compose up -d db`.

## Tasks & Acceptance

**Execution:**
- [x] `api/src/wallets/wallet.entity.ts` + `api/src/database/migrations/<ts>-Wallets.ts` -- entidade (`OneToOne` com `User` via `user_id`, sem `eager`) e migration gerada + `INSERT` das carteiras existentes.
- [x] `api/src/wallets/wallet.rules.ts` (+ spec) -- `MAX_BALANCE`, `deposit(wallet, amount)` recebe `{ balance, committed }` e devolve o novo estado.
- [x] `api/src/wallets/wallets.service.ts` -- `open(manager, userId)`, `find(userId)`, `deposit(userId, amount)`.
- [x] `api/src/wallets/wallets.controller.ts`, `wallets.module.ts`, `dto/deposit.dto.ts` (+ spec), `dto/wallet-response.dto.ts` (`toWalletResponse` + spec).
- [x] `api/src/users/users.service.ts`, `users.module.ts`, `api/src/app.module.ts` -- transação do cadastro e registro do módulo.
- [x] `api/src/common/domain.exception.ts`, `domain-exception.filter.ts` (+ spec) -- novo código 422.
- [x] `README.md` -- em "Fora do escopo": uma linha dizendo que não há extrato de movimentações da carteira.
- [x] `docs/ai-log.md` -- entrada da 2.2; `docs/stories/sprint-status.yaml` -- 2.2 `review` ao fim.

**Acceptance Criteria:**
- Given o banco com usuários da 2.1, when a migration roda, then cada um tem carteira `0/0` e `\d wallets` mostra o `UNIQUE` e o `CHECK`.
- Given `GET /wallet` com o log de query ligado, when chamado, then aparece um único `SELECT` (fora as do guard, que não tocam no banco).
- Given `lint:check`, `test` e `build`, when rodo, then os três passam.

## Implementation Notes

## Spec Change Log

## Review Triage Log

Passada 1 (só edge-case-hunter, regra do `CLAUDE.md`). Nenhum patch.

| Achado | Veredito | Rota / evidência |
|---|---|---|
| Cadastro feito por instância antiga durante o deploy, depois do `INSERT` da migration, fica sem carteira | low | rejeitado: janela de segundos no deploy do Render; o banco é recriado com seed na entrega; a correção (abrir carteira sob demanda) acrescenta ramo |
| Licitante sem carteira recebe 404 cru no `GET /wallet` | low | rejeitado: só acontece pelo caso acima; mesma razão |
| `deposit()` chamado fora do DTO com valor negativo ou fracionário | false | o único chamador é o `WalletsService.deposit`, que só recebe `amount` validado pelo `DepositDto` |
| `23505` do `UNIQUE (user_id)` de `wallets` viraria `EMAIL_TAKEN` | false | a carteira é inserida com o `id` que o usuário acabou de receber na mesma transação; não há como colidir |

## Verification

**Commands:**
- `cd api && npm run lint:check && npm test && npm run build` -- tudo verde.
- `docker compose up -d db && cd api && npm run migration:run` -- aplica sem erro.

**Manual checks:**
- `curl`: signup cria carteira; `GET /wallet` 200; depósito 201 e saldo somado; 99/10_000_001/150.5 → 400; teto → 422; leiloeiro → 403; sem token → 401.
