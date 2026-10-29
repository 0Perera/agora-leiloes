---
title: 'README final'
type: 'docs'
created: '2026-10-29'
status: 'review'
baseline_commit: '6300b95'
route: 'dispatch'
review_loop_iteration: 0
context: ['docs/stories/epic-6-context.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** o README ainda não deixa o avaliador rodar, testar e entender o sistema sem ler o código, e a revisão das stories 6.1 a 6.6 deixou achados pendentes.

**Approach:** duas partes.

Parte 1, achados da revisão das stories 6.1 a 6.6:
1. Destaque da vitrine relê a carteira quando o lote é cancelado, só quando a carteira existe (visitante e leiloeiro não têm `WalletProvider`), como o `featured.tsx` já faz.
2. `WalletsService.deposit` devolve `WalletResponseDto` e o controller só repassa.
3. Seed usa `lastBid()` no lugar da consulta própria do último lance.
4. Tipos do painel com os nomes da API: `LotState`, `DashboardResult`, `DashboardFilter` e `DashboardPage`.
5. Remove os tipos `CancelledEvent` e `SettledEvent`, sem uso.
6. Textos do teto do depósito montados com `formatMoney(maxDeposit)`.
7. `demoPassword` e `demoAccounts` em camelCase.
8. `describe('standingRules.standing')`.

Parte 2, README:
- Seções do `CLAUDE.md`, com Swagger e tema escuro em "Fora do escopo" e as linhas de "Comportamentos esperados" pedidas na story.
- Na seção Testes, uma linha sobre o squash (D-021) e as branches mantidas (D-055).
- `docs/desenvolvimento.md` com hot reload, migrations e seed fora do compose, levando do `deploy-notes.md` só a topologia, os limites do plano free e as armadilhas de configuração.
- Imagens: banner, mockups de monitor e celular no topo (`preview-desktop.png`, `preview-mobile.png`, fundo transparente, até ~500 KB), divisores, `fluxo-do-lance.svg`, `modelo-de-dados.svg`, a Escola de Atenas e um único print, `audit-tampered.png`, na Auditoria. "Testar agora" fica só em texto. `scripts/screenshots.mjs` gera só o que é usado.

## Boundaries & Constraints

**Always:**
- README com no máximo 300 linhas e nenhum link quebrado.
- Mockups montados com o Playwright, a partir de uma página temporária no scratchpad, apagada no fim.

**Never:**
- Imagem versionada que o README não usa.

</frozen-after-approval>
