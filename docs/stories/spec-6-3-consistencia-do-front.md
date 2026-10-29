---
title: 'Consistência do front'
type: 'refactor'
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

**Problem:** o `/web` repete a mesma lógica e o mesmo markup em várias features (checagem de 404, `Load<T>`, constantes, selo de status, contagem regressiva, abas, esqueletos, formatação de data, leitura do número do lote), e duas features importam de dentro de outras.

**Approach:** concentrar cada repetição num lugar só em `shared/` e trocar as cópias pelo uso dele, sem mudar comportamento nem visual. Itens definidos pelo usuário (1 a 13 da abertura da story).

## Boundaries & Constraints

**Always:**
- Refatoração pura: mesmas mensagens, mesmos estados, mesmo markup final (classes e ARIA), exceto onde o usuário pediu mudança (abas com o visual do `<Tabs>`, `missingText` com `lotLabel`, apelidos de teste).
- Os testes existentes são a rede; testes de função movida mudam só de arquivo/import. Sem casos novos (pedido do usuário).
- `shared/` só recebe o que duas ou mais features usam; nenhuma feature importa de `features/<outra>/`.
- Comentários: minúscula, sem ponto final, sem referência a story ou épico (usar D-NNN ou o motivo).

**Never:**
- Renomear classes CSS em massa; mexer na API; dependência nova no projeto (o puppeteer dos screenshots fica só no scratchpad).
- Mudar o `maxDelay` de `use-room.ts`: é o teto do `setTimeout` em ms, outro conceito que coincide com o teto do integer.

</frozen-after-approval>

## Code Map

- `web/src/shared/api/client.ts:34` -- `ApiError`; recebe `isNotFound(caught: unknown)`.
- 404 à mão: `lots/audit-lookup.tsx:9`, `lots/use-featured.ts:18`, `live-room/bid-form.tsx:53`, `live-room/use-room.ts:59,151`, `auctioneer/lot-errors.ts:85`, `audit/use-audit.ts:18`, `receipts/use-receipt.ts:12`, `shared/lib/use-lot-stream.ts:16`.
- `Load<T>`: `auctioneer/use-dashboard.ts:9`, `lots/use-showcase.ts:6`, `my-bids/use-my-bids.ts:5` (`MyBidsState` = `Load<MyBids>`); consumidores `summary.tsx`, `ledger.tsx`.
- 120 s: `lots/lot-card.tsx:9`, `lots/featured.tsx:14`, `live-room/room-summary.ts:12`, `my-bids/my-bids.ts:15` (todos com `<`).
- Teto do integer: `live-room/room-summary.ts:14`, `lots/showcase-search.ts:4`, `audit/audit.ts:107`. `maxPage = 100`: `live-room/room-bids.ts:7`, `shared/ui/pager.tsx:4`.
- Mapas de selo: `live-room/room-view.tsx:32`, `lots/lot-card.tsx:11`, `audit/audit-page.tsx:23`, `auctioneer/ledger-row.tsx:22`, `lots/featured.tsx:41` (ternário live/scheduled).
- Contagem: `lots/featured.tsx` `HeroCountdown` (classes extras `home-countdown__value/__sep`) e `live-room/room-timing.tsx` `RoomCountdown`/`Unit` (`room-countdown__*`).
- Abas: `shared/ui/tabs.tsx` (usado em `my-bids-page.tsx`); `lots/showcase.tsx:61` + `lots.css` `.home-tabs/.home-tab*` (dentro de `.home-toolbar`, que já tem borda inferior); `auctioneer/ledger.tsx:67` + `auctioneer.css` `.panel-tab*` (`.panel-filters` é o contêiner).
- Esqueletos: `shared/ui/skeleton.css` (`.skel`, importado no `main.tsx`); `auctioneer.css` `.panel-skel` + `@keyframes panel-skel` + reduced-motion; `wallet.css` `.wallet-skel` + `@keyframes wallet-skel` + reduced-motion.
- Datas: `shared/lib/date.ts` (três `part()` e um `pad()`), `shared/lib/countdown.ts:16` (`pad`), `audit/audit.ts:57` e `receipts/receipt.ts:4` ("09h05"), `audit/audit-page.tsx:29` e `live-room/room-history.tsx:15` (`Intl.DateTimeFormat` locais).
- Número do lote: `live-room/room-summary.ts:56` `parseLotId` (importado por `audit/audit-page.tsx`); `lots/showcase-search.ts` `parseSearch`; `audit/audit.ts:113` `parseLookup`, `missingText`, `lookupFailed` (usados só por `lots/audit-lookup.tsx`).
- Imports cruzados de carteira: `wallet/use-wallet.ts` e `use-wallet-refresh.ts` (sem dependência da feature) usados por `live-room` e `lots`.
- `shared/ui/bundle.css` (cabeçalho "Copie este arquivo", 11 banners `/* ---- */`), `web/vite.config.ts:4` (URL do template).
- Factories: `shared/lib/live-bids.spec.ts` e `live-room/room-bids.spec.ts` (`makeLot`/`makeItem` iguais).

## Tasks & Acceptance

**Execution:**
- [x] `shared/api/client.ts` -- `isNotFound(caught)`; trocar as 9 checagens.
- [x] `shared/lib/load.ts` -- `Load<T>`; os três hooks e consumidores usam.
- [x] `shared/lib/limits.ts` -- `maxInteger`, `maxPage`; `shared/lib/countdown.ts` -- `urgentSeconds`. Trocar as cópias.
- [x] `shared/ui/status-badge.tsx` -- `<StatusBadge status>` (`ag-badge ag-badge--live|scheduled|closed`); trocar os 5 mapas.
- [x] `shared/ui/countdown.tsx` -- `<Countdown seconds urgent place="home"|"room">` com o markup atual; `featured.tsx` mantém a nota abaixo.
- [x] `showcase.tsx`, `ledger.tsx` -- usar `<Tabs>`; apagar `.home-tab*`, `.panel-tab*`; ajuste contextual mínimo onde a borda do `.tabs` duplicaria a do contêiner.
- [x] `auctioneer.css`, `wallet.css`, tsx de esqueleto -- base `skel` no lugar de `panel-skel`/`wallet-skel`; apagar keyframes e reduced-motion duplicados.
- [x] `shared/lib/date.ts` -- `pad`, helper de partes, `formatClock` ("09h05"), formatos da auditoria e do histórico; `countdown.ts`, `audit.ts`, `receipt.ts`, `audit-page.tsx`, `room-history.tsx` usam.
- [x] `shared/lib/lot-number.ts` (+ spec movido) -- `parseLotId` e `readLotNumber`; `parseSearch` continua em `lots`, `parseLookup`/`missingText`/`lookupFailed` vão para `features/lots/lookup.ts` (com os testes).
- [x] `shared/lib/use-wallet.ts`, `use-wallet-refresh.ts` -- mover da feature carteira.
- [x] `missingText` -- `${lotLabel(number)} não encontrado...`; atualizar o teste.
- [x] `bundle.css` -- tirar cabeçalho, banners e classes sem uso (grep em `src/` por classe antes de cada remoção).
- [x] Comentários de `web/` -- padronizar; apagar URL do `vite.config.ts`.
- [x] `shared/lib/test-factories.ts` -- `makeLot`/`makeItem` compartilhados; apelidos de teste no formato da D-044.

**Acceptance Criteria:**
- Given o `/web`, when roda `grep -rn "status === 404\|2_147_483_647\|= 120;\|type Load<\|from '\.\./[a-z-]*/" src/features`, then só sobra o `maxDelay` de `use-room.ts`.
- Given vitrine e livro do painel em 1280 e 360px, when comparados aos screenshots de antes, then só muda o que o `<Tabs>` já faz em Meus lances, sem rolagem horizontal.
- Given `npm run lint:check`, `npx vitest run` e `npm run build` em `web/`, then todos passam.

## Implementation Notes

- `readLotNumber(text, anyCase)` devolve `{ number, valid } | null`; `parseSearch` e `parseLookup` só traduzem para a saída de cada um.
- Abas: único ajuste contextual é `.home-toolbar .tabs { border-bottom: 0 }`; o `.panel-filters` saiu inteiro (era igual ao `.tabs`).
- `bundle.css`: removidas só classes sem nenhuma ocorrência em `src/`; mantidas as montadas em tempo de execução (`ag-badge--*`, `ag-seal--*`, `ag-notice--*`). `.prettierignore` passou a dizer que o arquivo segue o formato compacto do design system.
- Apelidos `AAAAAA`, `BBBBBB`, `ABCDEF` já estão no formato da D-044 e ficaram; `#A7F2`/`#B3C1` viraram `K7QX2M`/`P4RT6N`.
- Screenshots: livro do painel idêntico; vitrine muda só nas abas (visual do `<Tabs>`); sem rolagem horizontal em 1280 e 360px.

## Spec Change Log

## Review Triage Log

| Achado | Veredito | Evidência |
|---|---|---|
| `lots.css`: aba ativa da vitrine perdeu o `margin-bottom: -1px` (sublinhado 1px acima da borda) e ficou menor | false | é o visual do `.tabs` em Meus lances (os botões também não sobrepõem a borda lá), que o usuário aceitou como única mudança permitida |

## Verification

**Commands:**
- `cd web && npm run lint:check && npx vitest run && npm run build` -- expected: tudo verde

**Manual checks:**
- Screenshots antes/depois (Firefox headless via puppeteer no scratchpad) da vitrine, do livro do painel e de Meus lances em 1280 e 360px.
