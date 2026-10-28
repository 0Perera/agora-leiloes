---
title: 'Tela Meus lances e resultado no painel'
type: 'feature'
created: '2026-10-27'
status: 'done'
baseline_commit: '7a015af2c05914b5cb88ca90224919b7d69d6120'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/stories/epic-5-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** o licitante não tem onde acompanhar os lotes em que deu lance nem achar os comprovantes depois; o painel do leiloeiro não mostra o total recebido nem o resultado de cada lote encerrado. A API já entrega quase tudo (5.4); falta o artista em `GET /my-bids`.

**Approach:** criar `/my-bids` seguindo `docs/design/MeusLances.dc.html`, com as três seções em abas, e completar o resumo e o livro do painel conforme `docs/design/Painel.dc.html`.

## Boundaries & Constraints

**Always:**
- Commit `refactor(web)` à parte, antes da tela: `Tabs` em `shared/ui` (botões com `aria-pressed`, rótulo e contagem opcional, visual do `.panel-tab`) e `LinkCopy` movido de `features/receipts` para `shared/ui` (com `useCopy`, `writeClipboard` e a cópia manual), com texto do botão, texto de sucesso e classe por props. O comprovante continua idêntico.
- Commit `feat(bids)` à parte: `artist` nos três itens de `GET /my-bids` (select, DTO, teste e `types.ts`), sem query nova.
- Meus lances: abas Em andamento, Arrematados, Não arrematados com a contagem `(n)` de `counts`; abre em Em andamento; cada aba busca `GET /my-bids?section=&page=` e pagina com `Pager`. Todas as contagens zero: só o vazio do canvas ("Você ainda não deu lances" + "Ver lotes ao vivo" → `/`), sem abas.
- Em andamento: Nº (`lotLabel`/romano, D-054), obra (miniatura `/lots/:id/image` + título e artista), situação "Você está ganhando" (▲, azul) ou "Você foi superado" (▼, vermelho), lance atual, seu lance ("é o atual" quando lidera), "Encerra em" com contagem pelo relógio do navegador a cada segundo (`formatLeft`, vermelho abaixo de 2 min, "encerrando" ao zerar) e ação "Cobrir lance" (superado) ou "Abrir sala" (lidera) → `/lots/:id`.
- `awaitingSettlement`: "Encerra em" vira "Encerrado, aguardando liquidação"; "Você está ganhando" vira "Você arrematou · aguardando liquidação"; ação sempre "Abrir sala".
- Arrematados: placa do canvas com imagem, "Lote {nº}", título, artista, valor pago, "Arrematado em" (`formatLongDate`), "Ver comprovante" → `/receipts/:token` e `LinkCopy` "Copiar link de compartilhamento" / "✓ Link copiado".
- Não arrematados: valor final (nulo → "—"), seu maior lance, "Encerrou" (`formatShortDate`), ação "Abrir sala".
- Vazio por aba: "Nenhum lote em disputa agora." + link para a vitrine; "Você ainda não arrematou nenhum lote."; "Nenhum lote ficou com outro licitante.".
- Carregando com `.skel`; erro com `LoadError` ("Não foi possível carregar seus lances" / "Seus lances continuam registrados nos lotes. Só a consulta falhou.").
- Rota dentro de `RequireRole role="BIDDER"` (visitante → `/login`, leiloeiro → `/`); link "Meus lances" no cabeçalho só para licitante.
- Painel: cartão "Total recebido" primeiro no resumo (`received`, sublinhado duplo, nota "soma dos comprovantes dos lotes arrematados", sem número de lotes); esqueleto com quatro cartões. No livro, encerrado: liquidado com vencedor → valor + "arrematado por {apelido}" e ação "Ver comprovante"; sem lances → "Sem lances"; `result` nulo → "Aguardando liquidação" (apagado). Sem comprovante, a ação segue "Abrir sala".
- Valores com centavos (D-048), datas no fuso do navegador, nada quebra a partir de 360px; cabeçalho e blocos de `shared/ui` reaproveitados.

**Never:**
- Mudar as abas do painel, do login e da vitrine (revisão final, já no `deferred-work.md`) ou adicionar dependência. Na API, só o `artist` de `/my-bids`.
- Link "Auditar lote" agora: entra no `deferred-work.md` para a 5.8.

## I/O & Edge-Case Matrix

| Cenário | Estado | Resultado |
|---|---|---|
| Liderando, ao vivo | `winning`, sem `awaitingSettlement` | "Você está ganhando", "é o atual", contagem, "Abrir sala" |
| Superado | `outbid` | "Você foi superado", seu lance, "Cobrir lance" |
| Vencido sem liquidar, liderando | `winning` + `awaitingSettlement` | "Você arrematou · aguardando liquidação", "Encerrado, aguardando liquidação" |
| Vencido sem liquidar, superado | `outbid` + `awaitingSettlement` | "Você foi superado", "Encerrado, aguardando liquidação", "Abrir sala" |
| Perdido sem comprovante | `amount: null` | valor final "—" |
| Livro, encerrado sem liquidar | `result: null` | "Aguardando liquidação" |

</frozen-after-approval>

## Code Map

- `web/src/features/receipts/copy-button.tsx|.spec.ts` -- `useCopy`, `writeClipboard`, `LinkCopy`, `ManualCopy`; `HashCopy` fica e passa a importar de `shared/ui`. CSS `.receipt-copied`/`.receipt-manual*` em `receipt.css` sai junto.
- `web/src/features/auctioneer/ledger.tsx:67-81`, `auctioneer.css:507-537` -- abas do livro (`.panel-tab`, `aria-pressed`): modelo visual do `Tabs`; não mexer.
- `web/src/features/auctioneer/summary.tsx` -- `Term`, `SummarySkeleton` (3 cartões → 4); `.panel-tabula*` em `auctioneer.css:70-105`.
- `web/src/features/auctioneer/ledger-row.tsx` -- `resultOf`, `Action`; `.panel-result-cell`, `.panel-sub`, `.panel-money--muted`.
- `web/src/features/auctioneer/use-dashboard.ts` -- tipo `Load<T>` e padrão de busca com `attempt`/`active`.
- `api/src/bids/my-bids.service.ts` (`section.select`, linhas 23-60), `dto/my-bids.dto.ts`, `test/*my-bids*` -- onde entra `artist`.
- `web/src/shared/api/client.ts` -- `api` sem `myBids`; `lotImageUrl`. `types.ts:219-262` -- `MyBids`, `OngoingBid`, `WonBid`, `LostBid` prontos.
- `web/src/shared/ui/` -- `Pager`, `LoadError`, `skeleton.css` (`.skel`), `Niche` (arco), `NotFound`.
- `web/src/shared/lib/` -- `countdown.ts` (`formatLeft`), `date.ts` (`formatShortDate`, `formatLongDate`), `money.ts`, `roman.ts` (`lotLabel`, `toRoman`).
- `web/src/app/header.tsx` -- nav com `NavLink`; `router.tsx` -- bloco `RequireRole role="BIDDER"` já existe (`/wallet`).

## Tasks & Acceptance

**Execution:**
- [x] `web/src/shared/ui/tabs.tsx|.css`, `link-copy.tsx|.css|.spec.ts`, `features/receipts/copy-button.tsx`, `receipt-page.tsx`, `receipt.css` -- extrair (commit `refactor(web)`).
- [x] `api/src/bids/my-bids.service.ts`, `dto/my-bids.dto.ts`, teste, `web/src/shared/api/types.ts` -- `artist` (commit `feat(bids)`).
- [x] `web/src/shared/api/client.ts` -- `api.myBids(section, page)`.
- [x] `web/src/features/my-bids/my-bids.ts|.spec.ts` -- funções puras: situação e tempo da linha em andamento (matriz) e valor final.
- [x] `web/src/features/my-bids/use-my-bids.ts`, `my-bids-page.tsx`, `ongoing.tsx`, `won.tsx`, `lost.tsx`, `my-bids.css` -- tela, prefixo `bids-`.
- [x] `web/src/app/router.tsx`, `header.tsx` -- rota e link.
- [x] `web/src/features/auctioneer/summary.tsx`, `ledger-row.tsx`, `auctioneer.css` -- cartão e resultado; função de resultado testada.
- [x] `docs/stories/deferred-work.md`, `README.md`, `docs/ai-log.md` -- auditar lote (5.8), funcionalidade e entrada da story.

**Acceptance Criteria:**
- Given um licitante em `/my-bids`, when troca de aba ou de página, then vê a seção pedida sem recarregar e a contagem de cada aba.
- Given o clipboard recusado, when copia o link de um arrematado, then o link aparece selecionado para cópia manual.
- Given um leiloeiro no painel, when carrega, then vê "Total recebido" e o resultado de cada encerrado; em 1280px, fontes, espaços e larguras iguais aos canvas.
- Given 360, 768, 1024 e 1280px, when Meus lances e o painel são exibidos, then nada estica, vaza, sobrepõe nem quebra em lugar estranho.

## Implementation Notes

- `features/my-bids/cells.tsx` reúne as células de número e obra das duas tabelas.
- Classes da cópia viraram `copy-done` e `copy-manual*` em `shared/ui/link-copy.css`.
- Em 360px, o botão "Copiar link de compartilhamento" fica alinhado à esquerda (quebrava em duas linhas centralizadas).

## Spec Change Log

## Review Triage Log

| Achado | Veredito | Evidência |
|---|---|---|
| Contagem zera sem recarregar e a linha segue com "Cobrir lance" | low, corrigido | `actionOf` não olhava o tempo; o botão levava à sala encerrada. Agora recebe os segundos e devolve "Abrir sala" ao zerar, com teste. |

## Design Notes

Abas em vez das três seções empilhadas do canvas: a API pagina por seção, e cada aba reaproveita o mesmo `Pager`. Rótulo "Você está ganhando", o mesmo da sala e do destaque. A nota do total recebido não conta lotes: um vencido ainda não liquidado entraria na contagem sem estar no total. A contagem usa o relógio do navegador porque `/my-bids` não traz `serverTime`; a sala continua sendo a referência exata.

## Verification

**Commands:**
- `cd web && npx vitest run --silent` -- verde
- `cd web && npm run lint:check && npm run build` -- sem erros

**Manual checks:**
- Canvas e app lado a lado em 1280px (Meus lances e painel); screenshots em 360, 768, 1024 e 1280.
