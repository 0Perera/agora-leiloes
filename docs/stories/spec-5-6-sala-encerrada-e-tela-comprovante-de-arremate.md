---
title: 'Sala encerrada e tela Comprovante de arremate'
type: 'feature'
created: '2026-10-27'
status: 'done'
baseline_commit: '2b3a44d23479dc4607a1cd101d0bc5c0df66ec8c'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/stories/epic-5-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** a sala já vira para Encerrado e esconde o formulário, mas não mostra o resultado: o vencedor não sabe que arrematou nem acha o comprovante, e `/receipts/:token` não existe no front.

**Approach:** na sala encerrada, mostrar o resultado que o `GET /lots/:id` já traz (5.2/5.4) e reler a carteira do vencedor; criar a tela pública do comprovante seguindo `docs/design/Comprovante.dc.html`.

## Boundaries & Constraints

**Always:**
- A virada continua pelo `GET /lots/:id` que a sala já refaz (`useTurn`), que também liquida o lote. O evento `settled` do stream só dispara a mesma releitura (`sync`); o payload não é usado.
- Encerrado com `result` nulo: "Lote encerrado, aguardando liquidação." (selo inválido ou liquidação pendente), sem nova tentativa automática.
- Vencedor (`result.alias === me.alias`): bloco `ag-bidstatus--winning` com ✓, "Você arrematou este lote", "{valor} foram debitados da sua carteira." e "Ver comprovante" → `/receipts/{me.receiptToken}` (sem link se o token faltar). A carteira do cabeçalho é relida quando a situação muda com a sala aberta (não no carregamento inicial).
- Demais (licitante que perdeu, visitante, leiloeiro): bloco neutro "**Lote encerrado.** Arrematado por {alias} por {valor}." ou "O lote fechou sem lances.".
- Comprovante: número (`lotLabel`, D-054), título, imagem (`/lots/:lotId/image`), artista, valor, alias + "Apelido usado neste lote", data longa no fuso do navegador ("20 de outubro de 2026, 21h00"), selo Válido/Inválido com título, texto do canvas ("Conferido agora, às HHhMM" no válido) e hash abreviado (8 primeiros…8 últimos, inteiro no `title`). Inválido mostra todos os dados com o selo `ag-seal--tampered` e o título "Comprovante inválido".
- Copiar (hash e link): `navigator.clipboard.writeText`; sucesso mostra "✓ Copiado" (hash) ou "✓ Link do comprovante copiado" por 2,5s; falha (ou API ausente) mostra o texto num campo somente leitura já selecionado, com "Copie manualmente".
- Estados: carregando (esqueleto com `.skel`), "Comprovante não encontrado" (404, inclusive token malformado) e erro com "Tentar de novo" (`LoadError`). Cabeçalho atual do site, sem cabeçalho próprio.
- Valores com centavos (D-048). Nada quebra a partir de 360px.

**Never:**
- Link "Auditar este lote" no comprovante agora: registrar em `deferred-work.md` para a 5.8, junto do link da sala.
- Mudar a API, criar bloco com o prefixo da tela para algo que já existe em `shared/ui`, ou dependência nova.

## I/O & Edge-Case Matrix

| Cenário | Estado | Resultado |
|---|---|---|
| Vencedor, virada com a sala aberta | live → ended, `result.alias === me.alias` | "Você arrematou", link, carteira relida |
| Licitante que perdeu | ended, alias diferente | "Lote encerrado. Arrematado por #X por R$ …" |
| Sem lances | ended, `result.alias` nulo | "Lote encerrado. O lote fechou sem lances." |
| Liquidação pendente | ended, `result` nulo | "Lote encerrado, aguardando liquidação." |
| Clipboard recusado | `writeText` rejeita | campo selecionado para cópia manual |
| Token inexistente | 404 | "Comprovante não encontrado" + "Ir para a vitrine" |

</frozen-after-approval>

## Code Map

- `web/src/features/live-room/use-room.ts` -- `useTurn` já refaz o GET no `endsAt` (com `retryTurn`); `streaming` desliga o SSE quando encerra. Não mexer.
- `web/src/features/live-room/room-view.tsx` -- `RoomStatus` hoje devolve `null` em ended; formulário já some com `open`.
- `web/src/features/live-room/room-status.tsx` -- `RoomSituation` (live) chama `useWalletRefresh`; o ref precisa sobreviver à virada.
- `web/src/features/wallet/use-wallet-refresh.ts` -- aceita `Situation`; generalizar para uma chave `string`.
- `web/src/shared/ui/bid-situation.tsx` -- blocos `ag-bidstatus` (também usado em `features/lots/featured.tsx`).
- `web/src/shared/api/client.ts` -- `openLotStream` só ouve `bid`; `api` sem rota de comprovante.
- `web/src/shared/lib/use-lot-stream.ts` -- `sync()` refaz lote + histórico.
- `web/src/shared/lib/date.ts`, `roman.ts` (`lotLabel`), `money.ts` (`formatMoney`).
- `web/src/features/live-room/room.css` -- `.room-niche*` e `.room-missing*`, que o comprovante também usa.
- `web/src/app/router.tsx` -- rotas; `Layout` já traz o cabeçalho.
- `api/src/receipts/dto/receipt-response.dto.ts` / `types.ts` `Receipt` -- contrato pronto; sem imagem: usar `lotImageUrl(lotId)`.

## Tasks & Acceptance

**Execution:**
- [x] `web/src/shared/ui/niche.tsx|.css`, `not-found.tsx|.css` -- extrair o nicho e o "não encontrado" da sala (classes `niche*`, `not-found*`) e usar na sala -- duas features passam a usá-los (commit `refactor` à parte).
- [x] `web/src/features/wallet/use-wallet-refresh.ts` -- parâmetro vira `key: string`.
- [x] `web/src/shared/ui/bid-situation.tsx|.css` -- exportar `EndedSituation` (`won` com valor e token; `closed` com texto), bloco neutro do canvas em `bid-situation.css`.
- [x] `web/src/features/live-room/room-ended.ts|.spec.ts` -- função pura `endedOf(lot)` → `won | closed(text) | pending`, com testes da matriz.
- [x] `web/src/features/live-room/room-status.tsx`, `room-view.tsx` -- `BidderStatus` único (ao vivo e encerrado) com `useWalletRefresh(\`${status}:${situação}\`)`; visitante e leiloeiro veem o bloco encerrado.
- [x] `web/src/shared/api/client.ts`, `use-lot-stream.ts` -- ouvir `settled` → `sync()`; `api.receipt(token)`.
- [x] `web/src/shared/lib/date.ts|.spec.ts` -- `formatLongDate`.
- [x] `web/src/features/receipts/` -- `receipt-page.tsx`, `use-receipt.ts`, `copy-button.tsx`, `receipt.ts|.spec.ts` (`shortHash`), `receipt.css`; rota `/receipts/:token` em `router.tsx`.
- [x] `docs/stories/deferred-work.md` -- links de auditoria (comprovante e sala) para a 5.8.
- [x] `README.md`, `docs/ai-log.md` -- funcionalidade nova e entrada da story.

**Acceptance Criteria:**
- Given a sala aberta de um lote ao vivo, when a contagem zera ou chega `settled`, then o selo vira Encerrado, o formulário some e o resultado aparece sem recarregar.
- Given `/receipts/:token` sem login, when carrega, then mostra os dados e o selo; em 1280px tamanhos de fonte, espaços e larguras iguais ao canvas.
- Given 360, 768, 1024 e 1280px, when a sala encerrada e o comprovante são exibidos, then nada estica, vaza, sobrepõe nem quebra em lugar estranho.

## Implementation Notes

- As classes compartilhadas do nicho são `arch*`, não `niche*`: `features/lots/lots.css` já tem um `.niche` global, e o nome igual fazia o comprovante herdar a proporção dos cards da vitrine (commit `fix(web)` à parte).
- Comprovante em uma coluna até 900px (o canvas troca em 760px): com o nicho ao lado, a ficha ficava com ~120px em 768px e títulos longos quebravam no meio da palavra.
- Traços ao lado do número do lote somem abaixo de 640px, onde o `lotLabel` quebra em duas linhas.
- Chave da carteira: `live:<situação>` ao vivo e `ended:<resultado>` depois da virada.

## Spec Change Log

## Review Triage Log

| Achado | Veredito | Evidência |
|---|---|---|
| Cópia que conclui depois de desmontar cria timer e `setState` soltos | low, rejeitado | Sem efeito visível no React 19; a correção acrescenta proteção para um caso raro. |
| Segundo clique em "Copiar" com o clipboard recusando não seleciona o campo de novo | low, rejeitado | O campo continua visível e com o texto; corrigir pede estado extra. |
| Classes `arch*` diferem do `niche*` da spec | low, rejeitado | Divergência intencional para evitar a colisão com `lots.css`; registrada nas notas. |
| Chave do `useWalletRefresh` difere do texto da spec | false | `ended:<resultado>` muda na virada como pedido; o comportamento é o descrito. |

## Design Notes

`useWalletRefresh` usa um ref com a última chave: por isso o componente do licitante precisa ser o mesmo antes e depois da virada; com dois componentes, o ref nasce de novo e a carteira não é relida.

## Verification

**Commands:**
- `cd web && npx vitest run --silent` -- verde
- `cd web && npm run lint:check && npm run build` -- sem erros

**Manual checks:**
- Canvas e app lado a lado em 1280px; screenshots em 360, 768, 1024 e 1280 da sala (vencedor, perdedor, sem lances, pendente) e do comprovante (válido, inválido, não encontrado).
