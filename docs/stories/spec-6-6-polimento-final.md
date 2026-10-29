---
title: 'Polimento final'
type: 'feature'
created: '2026-10-28'
status: 'in-progress'
baseline_commit: '310e2964888def88dc58bd90c66d1e2fd2c0b389'
route: 'dispatch'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** o fluxo ainda tem arestas: não há rodapé, o licitante não vê a própria posição na sala (o enunciado pede), o painel do leiloeiro obriga a rolar e a clicar em botões redundantes, e o menu do cabeçalho fica espremido abaixo de ~420px.

**Approach:** itens da seção "Polimento visual" do `deferred-work.md` mais os pedidos da abertura, cada um marcado como feito:
1. Rodapé em todas as telas (faixa grega, logo, Como funciona, Auditoria, GitHub, "Projeto do desafio Elite Dev da Verzel").
2. Posição do licitante na sala: "Seu maior lance: R$ 5.500,00 · 2º de 3 licitantes", calculada na API a partir de `bids` e atualizada em tempo real.
3. Painel, acervo: ao escolher a obra, rolar até a ficha do lote e focar o primeiro campo.
4. Painel, livro de lotes: título vira link para a sala; sai o "Abrir sala"; fica só "Cancelar lote".
5. Ícone de sugestões ao lado da busca do acervo; clicar num termo preenche e busca. A lista muda com o departamento escolhido (conferido na API, todos com imagem): europeia: portrait, Rembrandt, Madonna, landscape, marble; greco-romana: portrait, amphora, vase, coin, marble.
6. Menu do cabeçalho abaixo de ~420px em duas linhas, à esquerda, com espaço normal entre links.
7. Painel em modo cartão (abaixo de 1220px): selo e botão com a largura do conteúdo (largura total só abaixo de 480px); miniatura alinhada ao título.
8. Contas de demonstração (Entrar) como caixa que abre, com `<details>`/`<summary>` nativos, começando fechada, sem dependência e sem cor nova. Fechada: uma linha logo abaixo de "Ainda não tem conta? Criar conta", no lugar do bloco atual; botão de largura total, discreto, borda fina dourada, versalete "Testar com uma conta de demonstração", seta à direita que gira ao abrir, altura de um campo de formulário. Aberta: caixa no estilo dos cartões (mármore claro, borda dourada fina), uma linha clicável por conta: nome em Cinzel (Casa Ágora, Geovanna, Felipe), papel em texto menor ao lado (Leiloeiro, Licitante), e-mail pequeno e esmaecido embaixo; separador fino entre linhas; fundo dourado bem claro no hover e no foco; rodapé "Senha de todas: Agora2026!". Clicar numa conta preenche e-mail e senha, fecha a caixa e foca o Entrar.
9. Sala, "Preencher com": os três valores cabem na mesma linha (ou quebram de forma equilibrada) com valores grandes (R$ 130.000,00) em 360, 768, 1024 e 1280px.
10. Tempo restante acima de 48 h: dias e horas na contagem da sala e do destaque ("6 DIAS : 23 H") e no "Encerra em" dos cards (e em Meus lances), no estilo atual ("6d 23h"); até 48 h, como hoje. Uma função só de divisão e formatação do tempo para os três lugares, com testes.
11. Busca no acervo: imagem da CDN aparece com fade ao terminar de carregar; o fundo atual fica como espera.
12. Bug: `/lots/:id/image` é `immutable` por 1 ano; com o banco recriado, o mesmo id vira outra obra e o navegador mostra a imagem antiga. `lotImageUrl` passa a receber o `artworkId` e monta `?v=<artworkId>`, em todos os lugares (card, destaque, sala, comprovante, painel, lote criado, Meus lances); o cache continua `immutable`. Teste da função que monta a URL.

13. Teto por depósito passa de R$ 100.000,00 para R$ 10.000.000,00 (`1_000_000_000` centavos) no `DepositDto` (`api/src/wallets/dto/deposit.dto.ts`) e no `maxDeposit` do front (`web/src/features/wallet/deposit.ts`), com a mensagem de limite, a dica do formulário (`deposit-form.tsx:88`), os testes dos dois lados (`deposit.dto.spec.ts`, `deposit.spec.ts`) e a linha de `docs/screens.md:127`. O teto do saldo (`BALANCE_LIMIT_EXCEEDED`, D-015) não muda. O cabeçalho (comentário em `layout.css:369`, medido com R$ 100.000,00) é conferido em 360px com saldo de R$ 10.000.000,00.

## Boundaries & Constraints

**Always:**
- Posição pelo maior lance de cada licitante, lido de `bids` (nunca de `current_bid`, D-042). Regra pura com TDD (commit `test` vermelho antes, D-055).
- `me.standing` só existe para licitante com lance no lote; leiloeiro e visitante não recebem.
- Tempo real: o stream continua só notificação; o front refaz o `GET /lots/:id` quando chega lance novo e o licitante já deu lance.
- Rodapé reaproveita tokens e classes existentes (`on-dark`, `ag-meander--light`) e o mesmo logo do cabeçalho.
- Mudança de contrato atualiza `web/src/shared/api/types.ts`.

**Never:**
- Sem dependência nova, sem migration, sem alias ou dado pessoal novo no payload do SSE.
- Posição não aparece na vitrine (destaque ao vivo), na sala encerrada nem na cancelada.
- O título do lote cancelado não vira link (a sala dá 404).

## I/O & Edge-Case Matrix

| Cenário | Estado | Resultado |
|---|---|---|
| Sem lance | licitante sem lance no lote | `me` sem `standing`; sala sem a linha |
| Líder | maiores: A 5.500, B 5.000 | A: `{ highest: 5500, rank: 1, bidders: 2 }` |
| Superado | maiores: A 6.000, B 5.500, C 5.000 | B: `rank: 2, bidders: 3` |
| Vários lances | B deu 4.000 e 5.500 | B: `highest: 5500` |
| Lance novo de outro | evento `bid` na sala aberta | posição atualizada sem recarregar |
| Contagem | 604.380 s (6 d 23 h 53 min) | `6 DIAS : 23 H` |
| Contagem | exatamente 48 h | `48 HORAS : 00 MIN` |
| Card | 604.380 s | `6d 23h` |
| Imagem | lote 3, obra 135382 | `/lots/3/image?v=135382` |

**Testes aprovados.** `describe('standing')`: devolve nulo para quem não deu lance; coloca o líder em 1º; conta como posição os licitantes com maior lance acima do seu; conta o total de licitantes distintos; devolve o maior lance do usuário. E2E `realtime`: o superado recebe `rank: 2, bidders: 2`. Divisão do tempo: teste depois, com os casos de contagem e card acima. URL da imagem: teste do `lotImageUrl`.

**Rodapé:** inclui o crédito "Imagens das obras: Cleveland Museum of Art." (aprovado).

</frozen-after-approval>

## Code Map

- `api/src/bids/last-bid.ts` -- modelo para a nova query `bidderTops(manager, lotId)` (`bids/bidder-tops.ts`): `SELECT user_id, MAX(amount) ... GROUP BY user_id`, uma query, sem loop.
- `api/src/bids/standing.rules.ts` (novo) + spec -- `standing(tops, userId)` → `{ highest, rank, bidders } | null`; rank = 1 + licitantes com maior lance acima.
- `api/src/lots/lots.service.ts:172` `find()` / `:304` `viewer()` -- só chama `bidderTops` quando `raw.hasBid`; põe `standing` no `me`.
- `api/src/lots/dto/lot-detail.dto.ts` -- `LotViewerDto.standing?: StandingDto` (classe).
- `api/test/realtime.e2e-spec.ts` -- já cobre `hasBid`; ganha o caso do superado.
- `web/src/shared/api/types.ts:136` -- `me.standing?`.
- `web/src/features/live-room/use-room.ts` -- novo efeito: `bidCount` cresceu e `me.hasBid` → `api.lot(id)` e `synced` (sem histórico). `mergeRoom` (`shared/lib/live-bids.ts`) mantém o `me` atual quando o GET chega velho (`stale`).
- `web/src/shared/ui/bid-situation.tsx` -- prop opcional `standing`; a vitrine (`features/lots/featured.tsx`) não passa. `room-status.tsx` passa `me.standing`.
- `web/src/app/header.tsx` -- `Logo` sai para `app/logo.tsx`, usado também pelo novo `app/footer.tsx`; `app/layout.tsx` monta o rodapé depois do `main`; estilos em `app/layout.css` (canvas `docs/design/Main.dc.html:397`, fundo `--ink`).
- `web/src/app/layout.css` (media 480/468/440px) -- abaixo de 420px: `flex-wrap: wrap`, sem rolagem/máscara, gap normal; nome completo do painel volta.
- `web/src/features/auctioneer/lot-form.tsx` -- ao montar (é `key` da obra), `scrollIntoView` respeitando `prefers-reduced-motion` (como `reveal` em `ledger-row.tsx`) e foco em `f-startingBid`.
- `web/src/features/auctioneer/ledger-row.tsx` -- título em `Link` para `/lots/:id` (não cancelado); `Action` sem "Abrir sala"; "Ver comprovante" continua.
- `web/src/features/auctioneer/catalog-search.tsx` + `auctioneer.css` -- botão de sugestões ao lado do campo, lista em popover (padrão de fechar de `app/menu-close.ts`); clicar preenche `text` e chama `run`.
- `web/src/features/auth/demo-accounts-box.tsx` + `auth.css:322` -- item 8; `login-page.tsx:24` `pick` já preenche e foca o Entrar; o box fecha o `<details>` (ref) ao escolher.
- `web/src/features/live-room/bid-form.tsx:87` + `room.css:296` -- `.room-shortcuts`/`.room-chip` (item 9): grade de 3 colunas iguais, valor sem quebra, padding/fonte menores no estreito.
- `web/src/shared/lib/countdown.ts` `splitLeft`/`formatLeft` -- `inHours` vira unidade (`days`/`hours`/`minutes`); `shared/ui/countdown.tsx` troca os rótulos; usado por `lot-card.tsx` e `my-bids.ts`.
- `web/src/shared/api/client.ts:253` `lotImageUrl(id)` -- vira `lotImageUrl(id, artworkId)`; chamadas em `ledger-row`, `created-dialog`, `featured`, `receipt-page`, `lot-card`, `room-view`, `plaque`. Hoje só `LotDetail` traz `artworkId`: acrescentar a coluna/campo nos DTOs da API de card (`lot-card.dto.ts`, usado também no destaque), painel (`dashboard-lot.dto.ts`), lote criado (`created-lot.dto.ts`), comprovante (`api/src/receipts/dto`) e Meus lances (`bids/dto/my-bids.dto.ts`), com os `select` correspondentes, e em `types.ts`. Sem migration (`lots.artwork_id` já existe).
- `catalog-search.tsx` `ResultCard` -- `onLoad` liga classe `is-loaded`; opacidade com transição, sem animação em `prefers-reduced-motion`.
- `web/src/features/auctioneer/auctioneer.css:868` -- modo cartão: `justify-self: start` no selo e no botão; largura total só abaixo de 480px.

## Tasks & Acceptance

**Execution:**
- [ ] `api/src/bids/standing.rules.spec.ts` -- casos aprovados, vermelho -- commit `test` (D-055)
- [ ] `api/src/bids/standing.rules.ts`, `bidder-tops.ts`, `lots.service.ts`, `lot-detail.dto.ts`, e2e -- regra, query e `me.standing`
- [ ] `web/src/shared/api/types.ts`, `use-room.ts`, `live-bids.ts`, `bid-situation.tsx`, `room-status.tsx` -- linha da posição e atualização em tempo real
- [ ] `web/src/app/logo.tsx`, `footer.tsx`, `layout.tsx`, `header.tsx`, `layout.css` -- rodapé e menu abaixo de 420px
- [ ] `web/src/features/auctioneer/*` -- itens 3, 4, 5, 7 e 11
- [ ] `web/src/features/auth/demo-accounts-box.tsx`, `auth.css` -- item 8
- [ ] `web/src/features/live-room/bid-form.tsx`, `room.css` -- item 9
- [ ] `web/src/shared/lib/countdown.ts` + spec, `shared/ui/countdown.tsx` -- item 10
- [ ] Item 13: teto por depósito, testes e `screens.md` (commit próprio, escopo `wallets`; front em commit `web`)
- [ ] DTOs da API com `artworkId`, `types.ts`, `client.ts` + spec, chamadas de `lotImageUrl` -- item 12 (commit `fix`)
- [ ] `docs/stories/deferred-work.md` -- itens da seção "Polimento visual" marcados como feitos na 6.6
- [ ] `docs/ai-log.md`, `sprint-status.yaml` (6-5 e 6-6) -- registro da story

**Acceptance Criteria:**
- Given qualquer tela, when rola até o fim, then vê o rodapé com faixa grega, logo, os três links (GitHub em nova aba) e a linha do desafio, sem rolagem horizontal a partir de 360px.
- Given o licitante superado na sala, when outro licitante dá lance, then a linha da posição muda sem recarregar.
- Given o painel no celular, when o leiloeiro escolhe uma obra, then a ficha fica visível e o foco está no lance inicial.
- Given o livro de lotes, when o leiloeiro clica no título de um lote não cancelado, then abre a sala.
- Given a tela em 360px, when o cabeçalho tem os links do licitante ou do leiloeiro, then o menu quebra em duas linhas sem rolar.

## Design Notes

Rodapé escuro como o canvas: faixa grega clara no topo, bloco com logo + "ÁGORA" + "Casa de leilões de arte clássica", links à direita e uma linha final com "Projeto do desafio Elite Dev da Verzel" e o crédito "Imagens das obras: Cleveland Museum of Art." (do canvas). Ordinal com "º"; "1 licitante" no singular.

## Verification

**Commands:**
- `cd api && npm run lint:check && npm test && npm run test:e2e && npm run build` -- verde
- `cd web && npm run lint:check && npm test && npm run build` -- verde

**Manual checks:**
- Screenshots em 360, 768, 1024 e 1280px de vitrine (rodapé e menu), sala com posição e painel.
