---
title: 'Timer de liquidação em memória'
type: 'feature'
created: '2026-10-27'
status: 'done'
baseline_commit: 'bb2b2cdc390f870c75bd2965a28e1496cff393c3'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/stories/epic-5-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** hoje o lote vencido só é liquidado quando alguém acessa `GET /lots/:id`; sem visita, o leiloeiro não recebe o crédito na hora do fim.

**Approach:** um `SettlementTimer` em memória (sem cron, sem `@nestjs/schedule`, D-009) liquida os vencidos no boot e arma um único `setTimeout` para o próximo `ends_at` futuro, chamando o mesmo `SettlementService.settle` da 5.2. Lance e criação de lote pedem o recálculo depois do commit.

## Boundaries & Constraints

**Always:**
- O próximo timer só aponta para lote com `ends_at > now`, não cancelado e não liquidado. Vencidos são liquidados uma vez por boot e por disparo e nunca entram no cálculo do próximo: lote de selo inválido (D-064) não rearma o timer para o passado.
- Todo disparo, boot e recálculo captura o erro e registra no log (`Logger`, sem dado pessoal). Nenhuma Promise sem tratamento; falha num lote não impede os demais nem o rearme.
- Atraso limitado a `2^31 − 1` ms: acima disso, dispara no limite, não acha vencido e reagenda.
- `onModuleDestroy` limpa o timer e impede rearme de disparo em andamento.
- Recálculo chamado depois do commit (fora do `transaction`), sem `await` na resposta. `BidsModule` importa `SettlementModule`; nenhuma dependência circular (Settlement só importa LotEvents).
- Hora sempre do `Clock`. Testes unitários com timers falsos do Jest, sem tempo real.

**Never:** cron, intervalo periódico, `@nestjs/schedule`, nova env, migration, mudança de contrato HTTP.

## I/O & Edge-Case Matrix

| Cenário | Estado | Comportamento |
|---|---|---|
| Boot | lotes vencidos A, B; próximo C no futuro | liquida A e B, arma para `C.endsAt` |
| Mesmo instante | C e D com o mesmo `ends_at` | um disparo liquida os dois |
| Lote que não liquida | vencido com selo inválido, nenhum futuro | `settle` chamado uma vez; nenhum timer armado |
| Acima do limite | próximo em 30 dias | arma `2^31−1` ms; no disparo reagenda o restante |
| Lote novo antes | timer em t+60 min, lote novo em t+10 | recálculo arma t+10 |
| Prorrogação | único lote prorrogado de t+10 para t+12 | recálculo arma t+12; nada liquida em t+10 |
| Falha | `settle` de A rejeita | erro no log, B liquidado, timer seguinte armado |
| Recálculos fora de ordem | resposta antiga chega depois da nova | vale só a mais nova |
| Destroy | timer armado | nenhum timer pendente |

## Decisões aprovadas

- Casos de teste aprovados. Unitários (`settlement.timer.spec.ts`): (1) boot liquida os vencidos; (2) boot arma para o próximo `ends_at` futuro; (3) um disparo liquida todos os lotes do mesmo instante; (4) lote que não liquida não rearma o timer para o passado; (5) acima do limite do `setTimeout` dispara no limite e reagenda; (6) lote novo que encerra antes antecipa o timer; (7) prorrogação adia o timer e nada liquida no fim antigo; (8) erro num lote vai para o log e os demais liquidam; (9) depois do erro o timer seguinte fica armado; (10) recálculos fora de ordem: vale o mais recente; (11) `onModuleDestroy` não deixa timer pendente; (17) erro ao liquidar no boot vai para o log e a API termina de subir, com o timer armado. E2e (`settlement.e2e-spec.ts`): (12) `due` inclui `ends_at == now`; (13) `due` exclui cancelado e liquidado; (14) `next` devolve só `ends_at` futuro de lote aberto; (15) lance chama `refresh`; (16) criação de lote chama `refresh`.
- Aprovadas: timer desligado no e2e (fake que conta `refresh`), recálculo por substituição com geração, `due`/`next` no `SettlementService`.

</frozen-after-approval>

## Code Map

- `api/src/settlement/settlement.service.ts` -- `settle(lotId)` da 5.2 (idempotente, sem erro de regra). Acrescentar `due(now): Promise<number[]>` (ids com `ends_at <= now`, `settled_at`/`cancelled_at` nulos, ordem `ends_at`, só `id`) e `next(now): Promise<Date | null>` (menor `ends_at > now` aberto). Índice `lots_ends_at` já existe.
- `api/src/settlement/settlement.module.ts` -- registrar e exportar `SettlementTimer`.
- `api/src/bids/bids.service.ts` -- `place()`: depois de `this.events.publish`, `this.timer.refresh()`. `bids.module.ts` importa `SettlementModule`.
- `api/src/lots/lots.service.ts` -- `create()`: guardar o resultado da transação, chamar `this.timer.refresh()` e devolver. Construtor ganha `SettlementTimer`; `lots.service.spec.ts` e `bids.service.spec.ts` (construtor manual) passam um fake com `refresh: jest.fn()`.
- `api/test/app.ts` -- `start()` sobrescreve `SettlementTimer` por um fake que só conta `refresh`, exposto em `TestApp.timer`.
- Não mexer: regra `settlement.rules.ts`, gatilho por acesso em `LotsService.find`, `LotEventsService`.

## Tasks & Acceptance

**Execution:**
- [x] `api/src/settlement/settlement.service.ts` -- `due` e `next` com `select` só da coluna usada -- consultas do timer ficam junto do domínio
- [x] `api/src/settlement/settlement.timer.ts` -- `SettlementTimer` com `onApplicationBootstrap` (dispara `run` sem bloquear o boot), `refresh()`, `onModuleDestroy`; `run` = `due` → `settle` de cada id com catch individual → `refresh` -- coração da story
- [x] `api/src/settlement/settlement.timer.spec.ts` -- casos aprovados, `describe('SettlementTimer.<método>')`, fake de `SettlementService` com lotes em memória e `Clock` real sob `jest.useFakeTimers({ now })`
- [x] `api/src/settlement/settlement.module.ts`, `api/src/bids/bids.module.ts`, `bids.service.ts`, `lots.service.ts` e specs -- ligar o recálculo depois do commit
- [x] `api/test/app.ts`, `api/test/settlement.e2e-spec.ts` -- timer desligado no e2e; casos e2e aprovados
- [x] `README.md` -- linha da liquidação em "Comportamentos esperados" passa a citar o timer e o acesso como gatilhos
- [x] `docs/ai-log.md` -- entrada da 5.3

**Acceptance Criteria:**
- Given a API subindo, when o boot termina, then os vencidos não liquidados são liquidados e há um timer para o próximo `ends_at` futuro.
- Given um lance aceito ou um lote criado, when o commit acontece, then `refresh` é chamado fora da transação.
- Given a suíte e2e da 4.4, when roda, then nenhuma liquidação acontece por timer e o processo do Jest termina sem handle aberto.

## Review Triage Log

| Achado | Veredito | Evidência / destino |
|---|---|---|
| Lote que encerra durante o laço de `settle` fica fora do `next(MoreThan(t1))` | medium | `run` consulta `due(t0)` e `schedule` usa um `now` posterior; patch: `next` com o `now` do `due` |
| `refresh` atrasado cancela o handle cujo alvo já venceu | medium | `arm` sempre faz `clear`; com o laço de eventos ocupado, `next(now > alvo)` pula o lote; patch: não cancelar handle vencido |
| Falha no `next` deixa o timer desarmado até o próximo lance ou lote | medium | real, mas o gatilho por acesso cobre e o retry seria comportamento novo; defer |
| `due` sem limite após longo sono | low | lista só de ids, lotes vencidos são poucos no escopo do desafio; rejeitado |
| Lote travado (D-064) é tentado de novo a cada disparo | low | comportamento esperado e documentado no README (D-064); rejeitado |
| Destroy no meio do laço continua liquidando | low | erros são capturados e logados no shutdown; rejeitado |

## Design Notes

- **Recálculo por geração:** `refresh` incrementa um contador, consulta `next(now)` e só arma se ainda for a geração mais recente; arma substituindo o timer atual (não "o mais cedo"), senão a prorrogação dispararia no fim antigo. Disparos sobrepostos são inofensivos: `settle` é idempotente.
- **e2e com o timer desligado:** o `TestClock` fica em `BASE` (futuro em relação ao relógio real) e as suítes compartilham um container; o boot da suíte seguinte liquidaria sobras da anterior enquanto o `reset()` trunca as tabelas, e um `setTimeout` real por lote criado ficaria pendurado. Por isso `start()` troca o `SettlementTimer` por um fake sem hooks de ciclo de vida; o comportamento do timer é provado nos unitários com timers falsos, e as consultas `due`/`next` no e2e chamando o service direto.
- Liquidar N vencidos são N transações (uma trava por lote), não N+1 de leitura: a lista de ids sai de uma query só.

## Verification

**Commands:**
- `cd api && npx jest src/settlement --silent` -- expected: verde
- `cd api && npm run lint:check && npm test && npm run build` -- expected: sem erro
- `cd api && npm run test:e2e` -- expected: verde, sem aviso de handle aberto
