---
title: 'Seed idempotente e compose verificado'
type: 'feature'
created: '2026-10-28'
status: 'done'
baseline_commit: 'd6a3ea9feec4bad93e44aaf57f2f17a75c24453a'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/stories/epic-6-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** o avaliador abre o app (local ou no Render) com o banco vazio e não tem lote, lance, comprovante nem auditoria para ver.

**Approach:** `npm run seed` sobe o contexto do Nest e cria tudo pelos services, com o `Clock` (agora uma instância única, global) deslocado para o passado quando o lote precisa de história (D-045). Cada passo confere o que já existe antes de agir, então rodar de novo completa o que faltou e não duplica nada. A tela Entrar ganha as contas de demonstração.

## Boundaries & Constraints

**Always:**
- `Clock` registrado uma vez, em `ClockModule` `@Global()` em `common/`; sai dos `providers` de lots, bids, settlement e audit. Os e2e continuam com `overrideProvider(Clock)`.
- Contas (decisão do usuário): `leiloeiro@agora.dev` (Leiloeiro), `geovanna@agora.dev` (Geovanna) e `felipe@agora.dev` (Felipe), todas com a senha `Agora2026!`.
- Composição, tudo do mesmo leiloeiro, obras dos dois departamentos: Geovanna e Felipe com saldo; 4 ao vivo, abertos ~3 dias antes do seed e encerrando entre 7 e 10 dias depois dele (disputado com ~8 lances alternados, Geovanna lidera, Felipe lidera, sem lances); 2 agendados abrindo entre 5 e 6 dias depois do seed e encerrando depois disso; 3 encerrados e liquidados no passado (Geovanna arremata, Felipe arremata, sem lances); 1 cancelado no passado; 1 encerrado e liquidado no passado com ≥4 lances e depois adulterado.
- Escrita só pelos services (`AuthService.signup`, `WalletsService.deposit`, `LotsService.create/cancel`, `BidsService.place`, `SettlementService.settle`). A única exceção é o `UPDATE` da adulteração, num lance do meio do lote adulterado, nunca em lote ao vivo.
- Idempotência por chave natural: usuário pelo e-mail; lote por (leiloeiro, `artworkId`); lances pelo `seq` já gravado (só faltantes, no horário planejado a partir do `startsAt` gravado); depósito só com saldo zero; liquidação só sem `settled_at`; cancelamento só sem `cancelled_at`; adulteração só se o valor ainda é o planejado.
- Antes de qualquer escrita, `catalog.find` de todas as obras; Cleveland fora → mensagem clara, código de saída 1, nada gravado.
- `npm run seed` exige `DATABASE_URL` e `BID_HMAC_SECRET` no ambiente do processo, conferidos antes de subir o Nest; o `.env` não conta. No compose as duas já vêm do `environment` do serviço. Faltando uma, sai com erro citando o nome dela e nada é gravado (com o segredo errado, a API do Render recusaria todo lance com `LOT_INTEGRITY_FAILED` e a auditoria acusaria tudo).
- O `SettlementTimer` é parado no início do seed; `app.close()` em `try/finally`.
- Credenciais em `api/src/seed/accounts.ts` e `web/src/features/auth/demo-accounts.ts` (pacotes independentes, sem workspace), iguais às do README.

**Never:** `INSERT` direto; dependência nova; mudança de contrato da API; seed escolhendo obra por busca (IDs fixos, conferidos na API da Cleveland durante a implementação).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Banco vazio | `npm run seed` | 3 usuários, 11 lotes, auditoria `intact` em todos menos o adulterado (`tampered` no lance alterado); comprovantes válidos | N/A |
| Segunda execução | seed completo | nada novo em `users`, `lots`, `bids`, `receipts` | N/A |
| Execução interrompida | falha no meio dos lotes | rodar de novo completa os lotes e lances faltantes, sem duplicar | N/A |
| Sem segredo | `BID_HMAC_SECRET` ausente do ambiente | `BID_HMAC_SECRET is missing`, exit 1 | Nest nem sobe |
| Cleveland fora | `catalog.find` falha | `Cleveland indisponível…`, exit 1 | nada gravado |

</frozen-after-approval>

## Code Map

- `api/src/common/clock.ts` -- classe `Clock` (`now()`); ganha `clock.module.ts` `@Global()` ao lado.
- `api/src/{lots,bids,settlement,audit}/*.module.ts` -- tirar `Clock` de `providers`; `app.module.ts` importa `ClockModule`.
- `api/src/lots/lots.service.ts:207,225` -- `create` (valida `startsAt` com tolerância de 60 s contra o `Clock`, baixa a imagem, `timer.refresh()`), `cancel`.
- `api/src/bids/bids.service.ts:65` -- `place(userId, lotId, amount)`; `created_at` vem do `Clock`.
- `api/src/settlement/settlement.service.ts:46` e `settlement.timer.ts` -- `settle(lotId)`; `onModuleDestroy()` para o timer.
- `api/src/auth/auth.service.ts:23` -- `signup(SignupDto)`; `wallets.service.ts:66` -- `deposit(userId, amount)`.
- `api/test/app.ts` -- `start()`, `TestClock`, `FakeCatalog` (aceita qualquer `artworkId`), `FakeTimer`; reaproveitar no e2e do seed.
- `web/src/features/auth/login-page.tsx` + `use-auth-form.ts` (`change`) -- caixa de contas de demonstração.
- `docs/deploy-notes.md:40` -- seed em produção roda da máquina local com a External Database URL (o Render free não tem Shell).

## Tasks & Acceptance

**Execution:**
- [x] `api/src/common/clock.module.ts` + módulos -- Clock global único -- o seed troca o relógio com `app.get(Clock)` -- commit `refactor(lots)` próprio
- [x] `api/src/seed/{accounts,plan,seed,seed-env,main}.ts` -- plano declarativo (contas, obras, lotes com offsets e lances), `seed(app)` idempotente, `main.ts` com `NestFactory.createApplicationContext` -- testável sem o `main`
- [x] `api/package.json` -- script `seed` (`node dist/seed/main`) -- roda igual no compose e local
- [x] `api/test/seed.e2e-spec.ts` -- casos abaixo
- [x] `web/src/features/auth/{demo-accounts.ts,demo-accounts-box.tsx}` + `login-page.tsx` -- bloco abaixo do formulário, separado pela linha fina dourada do site, título pequeno em versalete "Contas de demonstração"; três botões lado a lado com classes existentes (`ag-btn--secondary` ou `--quiet`, sem estilo novo), nome em cima (Leiloeiro, Geovanna, Felipe) e papel embaixo em texto menor (Leiloeiro, Licitante, Licitante); clicar preenche e-mail e senha e foca "Entrar", sem enviar; linha "Senha de todas: Agora2026!". Em 360px cabem numa linha ou em grade de 3, sem esticar. Só no login.
- [x] `README.md` -- credenciais em "Testar agora", qual lote foi adulterado e por quê, "Testar a adulteração você mesmo" (3 SQL para o compose com o resultado esperado), comando do seed local, no compose e em produção (produção mostra `DATABASE_URL` e `BID_HMAC_SECRET`, com o aviso de copiar o segredo do Render)
- [x] `docs/deploy-notes.md` -- passo a passo do dia da entrega com o comando novo

**Casos de teste (para aprovar):**
- `seed.e2e-spec.ts` / `describe('seed')`:
  1. cria o leiloeiro e os dois licitantes com os e-mails do seed
  2. cria 4 lotes ao vivo, 2 agendados, 4 encerrados e 1 cancelado
  3. auditoria dá íntegro em todo lote não adulterado
  4. auditoria do lote adulterado aponta o lance alterado
  5. comprovantes dos lotes arrematados são válidos
  6. segunda execução não cria usuário, lote, lance nem comprovante
  7. execução interrompida no meio dos lotes completa na seguinte sem duplicar
  8. catálogo fora do ar não grava nada
- `seed-env.spec.ts` / `describe('seedEnv')`: 9. sem `BID_HMAC_SECRET` definido, sai com erro antes de gravar qualquer coisa
- `login-page.spec.tsx`: 10. botão de conta de demonstração preenche e-mail e senha

**Acceptance Criteria:**
- Given um checkout limpo, when `docker compose up` e depois `docker compose exec api npm run seed`, then o app em `localhost:5173` mostra os lotes do seed e o login de demonstração entra.
- Given o seed aplicado, when o painel do leiloeiro abre, then a aba Encerrados e o total recebido já mostram os lotes liquidados.

## Design Notes

Troca do relógio sem API nova no `Clock`: o seed sobrescreve `now` na instância global e restaura no `finally` de cada passo (`travel(clock, at, fn)`). O timer fica parado porque, armado com o relógio deslocado, liquidaria no meio da criação. Os lotes ao vivo também nascem no passado (~3 dias), para o histórico ter horários espalhados.

## Verification

**Commands:**
- `cd api && npm run lint:check && npx jest --silent && npm run test:e2e && npm run build` -- tudo verde
- `cd web && npm run lint:check && npx vitest run && npm run build` -- tudo verde
- `docker compose up -d --build && docker compose exec api npm run seed` duas vezes -- segunda sem novos registros

**Manual checks:**
- Screenshots do login e do cadastro em 360 e 1280px (bloco só no login), descrevendo no relatório o que aparece

## Implementation Notes

## Spec Change Log

## Review Triage Log

| # | Achado (edge-case-hunter) | Veredito | Evidência / rota |
|---|---|---|---|
| 1 | `run()` do bootstrap do timer ainda roda depois do `onModuleDestroy` | medium | `createApplicationContext` já chama `init`; o `run()` pode liquidar um lote passado incompleto. Consequência coberta pelo patch do #2 (patch) |
| 2 | Lance do seed em lote já liquidado | high | `bids()` não olha `settledAt`; o lance não confere `settled_at`. Patch: pular lances com lote liquidado + teste |
| 3 | Lances alheios num lote ao vivo depois de execução interrompida | low | Só após interrupção e lance de terceiro antes do rerun; correção pede comparar a cadeia. Rejeitado |
| 4 | Obra em lote ativo de outro leiloeiro | low | Só em banco com dados de dev (aconteceu no volume local); em produção o banco é recriado. Rejeitado, avisado ao usuário |
| 5 | E-mail do seed já cadastrado com outro papel | low | Exige cadastro manual prévio com o e-mail do seed. Rejeitado |
| 6 | Saldo > 0 mas insuficiente | low | O saldo só cai na liquidação; plano com folga de R$ 1 mi. Rejeitado |
| 7 | Falha da imagem depois da pré-checagem deixa dados parciais | low | A retomada completa; o README promete "nada gravado". Patch no texto (README e deploy-notes) |
| 8 | Outro consumidor do `Clock` durante o `travel` | false | No contexto do seed não há HTTP nem SSE; o único concorrente é o `run()` do #1, coberto pelo #2 |
| 9 | Comentário diz que o timer fica parado | low | O `run()` já iniciado continua. Patch no comentário |
| 10 | README sobre a Cleveland fora | low | Mesmo achado do #7 |
| 11 | CLAUDE.md fala em ~30 dias; o plano dá 7 a 10 | medium | Decisão do usuário na spec; o CLAUDE.md ficou desatualizado. Defer (arquivo de contexto do agente) |
