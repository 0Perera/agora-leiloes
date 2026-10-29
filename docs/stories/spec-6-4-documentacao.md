---
title: 'Documentação'
type: 'chore'
created: '2026-10-28'
status: 'done'
baseline_commit: '5b23cc71a433402898d4ba5d278075b7edd888af'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/stories/epic-6-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** os arquivos de `docs/` e o `CLAUDE.md` têm trechos desatualizados (telas antes das D-048/D-053/D-054/D-065, seed "~30 dias", códigos de erro), formatos diferentes entre entradas (cabeçalhos e status do `decisions.md`, seções do `ai-log.md`), justificativas que se apoiam em avaliação e falta um mapa de `docs/`.

**Approach:** revisar só documentação e um `.gitignore`, sem código: índice e formato único no `decisions.md`, formato único no `ai-log.md`, `screens.md` no estado final, `CLAUDE.md` sincronizado com o código, `docs/README.md` como mapa, spec da 1.1 no padrão, `sprint-status.yaml` com status reais.

## Boundaries & Constraints

**Always:**
- Texto em pt-BR, curto, sem óbvio nem redundância. Cada afirmação conferida no código (`api/src`, `web/src`).
- `decisions.md`: tabela de índice no topo (número, título, status, story); cabeçalho de toda entrada no formato `Status:` / `Data:` / `Story:` (+ `Substitui:` opcional); status só `Aceita`, `Substituída por D-NNN` ou `Parcialmente substituída por D-NNN`.
- `ai-log.md`: seções na ordem gerou → revisei → rejeitadas → "Erro encontrado na revisão" (sempre presente, por último); seção vazia com `- Nada a registrar.`; no máximo 8 itens por seção; "alias" como termo único na prosa.
- D-020: nova entrada "Substitui a parte da D-020 sobre o prazo" (ao vivo encerrando entre 7 e 10 dias, agendados abrindo entre 5 e 6 dias, decidido na 6.1), numerada D-069; a D-020 passa a "Parcialmente substituída por D-069".
- Antes da PR: `git fetch`, rebase em `origin/main`, manter decisões e mudanças das outras stories (D-068, D-069…) e incluí-las no índice.

**Never:**
- Tocar `README.md`, `docs/stories/deferred-work.md` ou `docs/deploy-notes.md`.
- Inventar revisão no ai-log ou mudar o sentido de uma decisão registrada.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Entrada do ai-log com mais de 8 itens | 2.4 (18), 3.1 (10), 3.3 (16), 3.4 (11), 3.7 (11), planejamento (9) | operacionais saem (marcar done, branch, revisores/lint, apagar banco, spec inteira, commits separados); itens da mesma tela/tema são unidos | nenhum item de decisão some sem estar em outro |
| Correção feita pela IA dentro de "O que a IA gerou" | 1.1, 2.1–2.4 | vai para "Erro encontrado na revisão" | — |
| Rebase com conflito em `decisions.md`/`CLAUDE.md` | outra story mergeada antes | entradas novas preservadas no formato novo e no índice | conflito resolvido à mão, nunca descartando a outra versão |

</frozen-after-approval>

## Code Map

- `docs/decisions.md` -- 67 entradas; cabeçalhos em uma linha (D-001–D-030, D-042–D-045) e em três linhas (D-031+). Datas: D-001–D-030 registradas em 2026-10-23 (commit 63cdd66), D-042–D-045 em 2026-10-25 (1a08e03). Status fora do padrão: D-007 ("Banco substituído por D-027" → parcial), D-030 ("Momento… substituído por D-035" → parcial), D-025 ("Complementa D-007", sai do cabeçalho). D-056 cita "caso 12/15/8" → `muda o hash quando dígitos passam de um campo para o vizinho`, `assina os campos em ordem fixa com prefixo bid:`, `selo de lote sem lances usa contagem zero e o hash genesis` (`api/src/audit/chain.spec.ts`). D-060 cita D-045 para o selo vazio → D-058. Linha 7: intervalo do planejamento (D-001–D-030 antes do código; D-036–D-045 no planejamento dos épicos).
- `docs/ai-log.md` -- "Erro da IA que peguei" (planejamento, 3.4, 4.2) e "Erro encontrado na revisão" (5.8, 6.1) viram uma seção só; vazios hoje: "Nenhuma.", "Nenhuma nesta story." etc. Linha 51 "D-001 a D-022" → D-030. "apelido" em 5.2–5.8 → alias.
- `docs/screens.md` -- header (`web/src/app/header.tsx`: Vitrine, Como funciona, Auditoria, Painel do leiloeiro, Meus lances, menu da conta); recusas (`features/live-room/bid-errors.ts`); veredito e marcas (`features/audit/audit.ts`); contas de demonstração (`features/auth/demo-accounts.ts`).
- `CLAUDE.md` -- árvore (falta `app.setup.ts`, `render.yaml`, conteúdo real de `docs/`), lista de códigos (falta `LOT_INTEGRITY_FAILED` 409, D-059), Seed (`api/src/seed/plan.ts`: ao vivo −3d com 10–12d; agendados +5d/+6d; um lance adulterado por `UPDATE` de propósito), "trade-off explicado no README" (README não explica) → D-006, lint do front é oxlint (D-033), testes do front em Vitest.
- `docs/planning/epics.md` -- linha 24 "D-001 a D-038" → D-045; linhas 9 e 160 apontam para `1.1-esqueleto.md`.
- `docs/stories/1.1-esqueleto.md` -- vira `spec-1-1-esqueleto-do-monorepo-no-ar.md` com frontmatter `status: 'done'`.
- `docs/stories/sprint-status.yaml` -- bloco de comentários em inglês sai; epic-3 → done; 6-1 → done; 6-2, 6-3, 6-5 → in-progress (worktrees ativas); 6-4 → done no fim.
- `web/.gitignore` -- a raiz já cobre logs, `node_modules`, `dist`, `.vscode`, `.idea`, `.DS_Store`; ficam `dist-ssr`, `*.local` e os de editor não cobertos.

## Tasks & Acceptance

**Execution:**
- [x] `docs/decisions.md` -- índice, cabeçalhos, status, justificativas de D-008/D-022/D-024/D-027/D-028/D-041 por motivo técnico ou de prazo, nomes de teste na D-056, D-058 na D-060, intervalo da linha 7.
- [x] `docs/ai-log.md` -- Resumo (juntar "Eu decido" e "O que não deleguei"; lista de testes: a IA propõe, eu aprovo, corto ou acrescento), formato único, cortes, alias, intervalo; entrada da 6.4.
- [x] `docs/screens.md` -- estado final das telas.
- [x] `CLAUDE.md` -- árvore, códigos, seed, promessas do README.
- [x] `docs/README.md` -- uma linha por arquivo/pasta de `docs/`, nota sobre specs e `epic-N-context` gerados pelo processo de stories, linha única sobre `docs/design/` (referências do Claude Design, não abrem sozinhas, arquivo → tela); nenhum README dentro de `docs/design/`.
- [x] `docs/stories/spec-1-1-…` (git mv) e `docs/planning/epics.md` -- renomear e corrigir referências e intervalo.
- [x] `docs/stories/sprint-status.yaml`, `web/.gitignore`.

**Acceptance Criteria:**
- Given `docs/`, when a story termina, then nenhum link relativo quebra (checado por script) e nada contradiz o código.
- Given o `decisions.md`, then toda entrada aparece no índice com o mesmo título e status do cabeçalho.
- Given o `ai-log.md`, then toda entrada tem as quatro seções na mesma ordem e nenhuma seção passa de 8 itens.

## Verification

**Commands:**
- `grep -c '^## D-' docs/decisions.md` e contagem de linhas do índice -- expected: iguais.
- script de links relativos em `docs/*.md`, `docs/stories/*.md` e `CLAUDE.md` -- expected: nenhum alvo inexistente.
- `cd web && git check-ignore -v dist-ssr x.local node_modules` -- expected: todos ignorados.

## Review Triage Log

Revisor: só o de casos de borda (regra do `CLAUDE.md` para esta story).

| Achado | Veredito | Evidência | Rota |
|---|---|---|---|
| `screens.md` sem a linha Dimensões | medium | `room-view.tsx:177` mostra `measurements` na sala | patch |
| `LOT_INTEGRITY_FAILED` parafraseado | low | texto difere de `bid-errors.ts` | patch |
| `epics.md` "não são rediscutidas" sem ressalva | low | D-020, D-036 e D-045 foram substituídas | patch |
| `CLAUDE.md` idempotência só por e-mail | low | `seed.ts` acha lote por leiloeiro + `artworkId` | patch |
| `web/.gitignore` sem `logs/` e `*-debug.log*` | low | raiz cobre `*.log`; projeto usa só npm; uso cotidiano improvável | rejeitado |
| `web/.gitignore` sem `!.vscode/extensions.json` | false | não existe `web/.vscode/`; a raiz já ignorava `.vscode/` inteiro | rejeitado |
| `sprint-status.yaml` 6-4 done antes do merge, 6-3/6-5 de outras worktrees | false | registrar a story no fim foi pedido; 6-3 e 6-5 estão em andamento de fato | rejeitado |
