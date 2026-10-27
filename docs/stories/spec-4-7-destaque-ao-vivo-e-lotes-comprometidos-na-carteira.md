---
title: 'Destaque ao vivo e lotes comprometidos na carteira'
type: 'feature'
created: '2026-10-27'
status: 'done'
baseline_commit: 'e4586158607448a632aa00a45bfed389c04f90bf'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/stories/epic-4-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** o destaque da página inicial mostra o estado do carregamento e nunca atualiza, e a Carteira diz sempre "Nenhum valor comprometido", embora a API da 4.5 já mande stream, `me.hasBid` e `lots`/`lotsTotal` no `GET /wallet`.

**Approach:** o destaque passa a usar o mesmo modelo da sala (lote + página 1 do histórico, unidos pelo `seq`) e o mesmo hook de stream, mostrando "ganhando"/"superado" como no canvas `Main.dc.html`; a Carteira lista os lotes comprometidos como no canvas `Carteira.dc.html`, com link para a sala.

## Boundaries & Constraints

**Always:**
- Reaproveitar, sem duplicar, o que a 4.6 criou. Num commit `refactor(web)` antes dos `feat`: `mergeBid`, `mergeRoom`, `situationOf`, `minimumOf`, `unite` e os tipos `LiveRoom`/`Situation` vão de `features/live-room/room-bids.ts` para `shared/lib/live-bids.ts` (com os casos do spec que os cobrem); `connection.ts` (+spec) e `use-stream.ts` (como `use-lot-stream.ts`) vão para `shared/lib/`; o quadro "ganhando"/"superado" vira `shared/ui/bid-situation.tsx`; `useWalletRefresh` vai para `features/wallet/use-wallet-refresh.ts`. `olderPage`, `appendPage` e `shortcuts` ficam na sala.
- Destaque: o lote é o do carregamento e nunca troca (D-037). Ele é o único stream da página (aberto com o lote agendado ou ao vivo, fechado ao sair); os cards não mudam. Lance pelo stream atualiza lance atual, nº de lances e prazo; ao conectar e reconectar, refaz `GET /lots/:id` e a página 1 do histórico, mesclando pelo `seq`.
- Licitante logado com o destaque ao vivo vê "Você está ganhando" ou "Você foi superado · Para cobrir, ofereça ao menos R$ X" (`situationOf` com `me.hasBid` e o maior `seq`); sem lance, nada. Quando a situação muda depois da carga, a carteira é relida sem "carregando".
- Lote do destaque cancelado com a página aberta (404 no stream/GET): o bloco some, como no carregamento.
- Carteira: ao abrir, relê `GET /wallet` em segundo plano (`refresh`). Lista os `lots` na ordem da API: número no formato da D-054 (romano com "nº N" embaixo, como a coluna do painel), título, situação (decisão do usuário: "▲ Você lidera · encerra {data}" com `endsAt` no futuro; "▲ Você arrematou · aguardando liquidação" com `endsAt` já passado), valor com `formatMoney` (D-048) e "Abrir sala do lote" levando a `/lots/:id`. Com `lotsTotal` maior que a lista: "e mais N lotes" ("e mais 1 lote"), sem link. Sem lotes: o texto vazio da 2.4. A nota do comprometido vira "reservado em N lote(s) que você lidera" com `lotsTotal`.
- Responsivo a partir de 360px, sem rolagem horizontal; botões, selos e links com a largura do conteúdo.

**Never:**
- Virada de status do destaque com a página aberta (agendado → ao vivo, ao vivo → encerrado): continua como na 3.6.
- Stream nos cards, troca de lote do destaque, paginação na lista da Carteira.
- Mudança na API além do `endsAt` no `CommittedLotDto` (decisão do usuário: commit `feat(wallets)` com teste unitário, um caso no e2e da carteira e `types.ts`; continua uma query); regra de negócio no front.

## I/O & Edge-Case Matrix

| Cenário | Entrada / Estado | Resultado |
|---|---|---|
| Lance de outro no destaque | evento `bid` com `seq` novo | lance atual, nº de lances e contagem atualizam; mesmo lote |
| `seq` repetido ou antigo | evento já conhecido / GET atrasado | nada volta nem duplica |
| Licitante lidera o destaque | carga ou evento | quadro "Você está ganhando" |
| Licitante superado | evento de outro alias com `hasBid` | quadro "Você foi superado" com o mínimo; carteira relida |
| Visitante ou leiloeiro | sem `me` | nenhum quadro |
| Carteira com 23 comprometidos | `lots` 20, `lotsTotal` 23 | 20 linhas + "e mais 3 lotes" |
| Lote comprometido já vencido | `endsAt` no passado, sem liquidação | "▲ Você arrematou · aguardando liquidação" |
| Carteira sem comprometidos | `lots` vazio | "Nenhum valor comprometido. Todo o seu saldo está livre para lances." |

</frozen-after-approval>

## Casos de teste (aprovados)

Vitest ao lado do arquivo:
- Os specs movidos continuam passando sem mudar os casos (`live-bids.spec.ts`, `connection.spec.ts`, e o que fica em `room-bids.spec.ts`).
- `holds.ts` (Carteira): `moreLots(total, shown)` devolve nada quando o total cabe na lista, "e mais 1 lote" com um a mais e "e mais 3 lotes" com três; `heldNote(count)` devolve "nada reservado agora" com zero, "reservado em 1 lote que você lidera" e "reservado em 2 lotes que você lidera"; `holdNote(endsAt, now)`: a linha do lote encerrado mostra "aguardando liquidação" (caso pedido pelo usuário).
- API (Jest): `WalletsService.committedLots` devolve o `endsAt` de cada lote; e2e da carteira confere o `endsAt` no `GET /wallet`.

## Code Map

- `web/src/features/live-room/room-bids.ts` (+spec) -- fica só com `olderPage`, `appendPage`, `shortcuts` (importando `unite`/`minimumOf` de `shared/lib/live-bids.ts`).
- `web/src/features/live-room/use-stream.ts`, `connection.ts` (+spec) -- movidos para `shared/lib/use-lot-stream.ts` e `shared/lib/connection.ts`; `use-room.ts`, `room-view.tsx` e `room-status.tsx` passam a importar de lá.
- `web/src/features/live-room/room-status.tsx` -- `RoomSituation` usa `BidSituation` de `shared/ui` e mantém só o texto "Você ainda não deu lance neste lote."; `useWalletRefresh` sai daqui.
- `web/src/shared/ui/bid-situation.tsx` (novo) -- `BidSituation({ situation, minimum })` com os blocos `ag-bidstatus--winning`/`--outbid` de `bundle.css`; não usa `useWallet`.
- `web/src/features/lots/use-featured.ts` -- estado `ready` vira `LiveRoom & { offset }`; carga `api.featured()` e depois `Promise.all([api.lot, api.lotBids(id, 1)])`, mantendo o 404 → `none` e `ended` → `none`; `useLotStream(id, live || scheduled, { onBid, onSync, onMissing })` com `mergeBid`/`mergeRoom` (padrão de `withBid`/`synced` de `use-room.ts`).
- `web/src/features/lots/featured.tsx` -- `FeaturedLot` recebe o `LiveRoom`; quadro de situação abaixo do prazo, só com `live` e `lot.me`, com `situationOf(me, bids[0])`, `minimumOf(lot)` e `useWalletRefresh`. `max-width: 560px` como no canvas.
- `web/src/features/lots/home-page.tsx` -- `offset` do novo estado.
- `web/src/features/wallet/wallet-page.tsx` -- `Holds` recebe a carteira; `refresh()` ao montar.
- `web/src/features/wallet/holds.ts` (novo) + spec -- `moreLots`, `heldNote`, `holdNote` (data com `formatShortDate`, comparação com `Date.now()`, como os cards da vitrine).
- `api/src/wallets/wallets.service.ts` (`committedLots`, `addSelect('lot.endsAt', 'endsAt')`), `dto/committed-lot.dto.ts`, spec do service, e2e da carteira em `api/test/`, `web/src/shared/api/types.ts` (`CommittedLot.endsAt`).
- `web/src/features/wallet/balance-equation.tsx` -- nota com `heldNote(wallet.lotsTotal)`.
- `web/src/features/wallet/wallet.css` -- `.wallet-hold` (grid `auto minmax(0,1fr) auto`, coluna do número com borda dupla cinábrio como `.panel-num`), `.wallet-holds-more`; abaixo de 480px o valor e o link descem para baixo do título.
- Não mexer: `shared/api/client.ts` (`openLotStream` já serve), `useTurn`, a sala além dos imports.

## Tasks & Acceptance

**Execution:**
- [x] `docs/stories/sprint-status.yaml` -- 4-6 `done` (feito em `e458615`), 4-7 `in-progress`
- [x] `api/src/wallets/*`, `api/test/*`, `web/src/shared/api/types.ts` -- commit `feat(wallets)`: `endsAt` nos lotes comprometidos
- [x] `shared/lib`, `shared/ui`, `features/live-room`, `features/wallet/use-wallet-refresh.ts` -- commit `refactor(web)`: mover o que a página inicial vai usar
- [x] `features/lots/*` -- commit `feat(web)`: destaque ao vivo
- [x] `features/wallet/*` -- commit `feat(web)`: lotes comprometidos na Carteira
- [x] `README.md` (se couber em "Comportamentos esperados"), `docs/ai-log.md`, `docs/stories/deferred-work.md` (um item só: virada de status do destaque com a página aberta, juntando o achado #1 da revisão da 3.6, "Abre em" desatualizado)

Cada commit compila e passa sozinho, com `npm run lint:check` antes, `Refs: story 4.7`. Sem push.

**Acceptance Criteria:**
- Given a página inicial aberta e a sala do destaque em outra aba, when um licitante dá lance na sala, then o destaque atualiza lance atual, nº de lances e prazo sem recarregar, e a aba de rede mostra um único stream.
- Given um licitante que lidera o destaque, when outro o supera, then o quadro vira "Você foi superado" e o resumo da carteira no cabeçalho devolve o valor ao disponível.
- Given a Carteira com lotes comprometidos, when o licitante clica em "Abrir sala do lote", then vai para a sala daquele lote.

## Verification

**Commands:**
- `cd api && npm run lint:check && npm test --silent && npm run build && npm run test:e2e` -- expected: verde
- `cd web && npm run lint:check && npm test -- --silent && npm run build` -- expected: verde

**Manual checks:**
- Screenshots da página inicial (visitante e licitante ganhando/superado) e da Carteira (com e sem lotes) em 360, 768, 1024 e 1280px.

## Implementation Notes

- Depois da entrega, a pedido do usuário, a nota do comprometido passou a "reservado em N lotes" (sem "que você lidera"), porque a contagem inclui lotes arrematados aguardando liquidação.

## Spec Change Log

## Review Triage Log

| # | Achado | Veredito | Evidência |
|---|---|---|---|
| 1 | Sessão encerrada com o destaque na tela: `useWallet` fora do provider derruba a página (edge) | false | o `Layout` troca a raiz da árvore (com e sem `WalletProvider`), então a página inicial remonta, volta a "carregando" e busca o lote sem token, sem `me`; o `FeaturedSituation` nunca renderiza sem provider (mesmo padrão da sala na 4.6) |
| 2 | Lote comprometido vence com a Carteira aberta e a linha continua "Você lidera · encerra {data passada}" (edge) | low | real, mas exige ficar na Carteira até o fim do lote; corrigir pede um relógio na página; rejeitado e listado |
| 3 | A nota "reservado em N lotes que você lidera" conta também lotes vencidos que a linha mostra como "Você arrematou" (edge) | low | real só com lote vencido e não liquidado (até a 5.x); o texto vem do bloco aprovado da spec, e mudar exige editar a spec; rejeitado e listado |
