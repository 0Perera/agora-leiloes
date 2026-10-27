---
title: 'Tela Sala do lote ao vivo (lances e tempo real)'
type: 'feature'
created: '2026-10-27'
status: 'in-progress'
baseline_commit: '539175e6c0d3ff95097e6eafa9dc903caa35f1f0'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/stories/epic-4-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** a sala da 3.7 só mostra o lote: não tem formulário de lance, situação do licitante, histórico nem tempo real, embora a API da 4.3/4.5 já ofereça lance, histórico, `me.alias` e stream.

**Approach:** completar `features/live-room` seguindo o canvas `docs/design/Sala.dc.html`: situação, formulário com atalhos e recusas traduzidas, histórico (página 1 de `GET /lots/:id/bids` + lances novos) e `EventSource` no stream, unindo tudo pelo `seq`.

## Boundaries & Constraints

**Always:**
- Stream lido com `addEventListener('bid', ...)`, nunca `onmessage`. No evento `open` (conectar e reconectar), refaz `GET /lots/:id` e a página 1 do histórico, sem esqueleto. Stream aberto só com o lote agendado ou ao vivo; fechado ao encerrar e ao sair da tela.
- Lance vindo do POST e do stream unido pelo `seq`: o mesmo `seq` nunca aparece duas vezes, e dado mais antigo (resposta lenta de um GET) nunca sobrescreve um lance mais novo.
- Botão "Dar lance" desabilitado e envio ignorado enquanto um POST está em andamento.
- Situação (decisão do usuário): ganhando se o maior `seq` tem `me.alias`; superado se `hasBid` e o maior `seq` é de outro; "ainda não deu lance" se não `hasBid`. `hasBid` vem de `me.hasBid` e vira `true` na sala quando chega lance com `me.alias` (POST ou stream).
- `GET /lots/:id` ganha `me.hasBid` para licitante logado (decisão do usuário): `EXISTS` em `bids` por `user_id` e `lot_id`, usando o índice `bids_user_id`, dentro da query única do detalhe. Commit `feat(lots)` separado, com teste unitário, um caso e2e e `types.ts`.
- Quando a situação muda depois da carga inicial, a carteira é relida sem passar por "carregando" (o resumo do cabeçalho não pisca).
- Mensagens e textos do canvas (ver Design Notes), valores com `formatMoney` (D-048), datas e horas no fuso do navegador, número do lote com `lotLabel` (D-054).
- Esqueleto e erro com "Tentar de novo" vêm de `shared/ui`; o que hoje está em feature vai para lá num commit `refactor(web)` antes do `feat`. Nenhum bloco novo com prefixo da tela para esses estados. Sem abas na sala.
- Layout do canvas no desktop; até 880px mantém o da 3.7 (decisão do usuário): obra primeiro, arco limitado a ~55vh, sem miniatura no cabeçalho, depois cabeçalho, resumo, situação, formulário, histórico e "Sobre a obra". Responsivo, sem rolagem horizontal a partir de 360px; botões e selos com a largura do conteúdo (o "Dar lance" ocupa a largura do formulário, como no canvas).

**Never:**
- Link para a auditoria do lote (vai para a 5.8, registrado no `deferred-work.md`).
- Estados de lote encerrado ("arrematou", "lote encerrado") e comprovante: 5.6. Encerrado mantém a sala de leitura da 3.7 com o histórico.
- Regra de negócio no front (o mínimo exibido é só ajuda; quem decide é a API); outra mudança na API além do `me.hasBid`.
- `fetch` ou `EventSource` em componente: tudo pelo `shared/api/client.ts`.

## I/O & Edge-Case Matrix

| Cenário | Entrada / Estado | Resultado |
|---|---|---|
| Detalhe com licitante | `GET /lots/:id` com Bearer de licitante | `me: { alias, hasBid }`; leiloeiro e visitante sem `me` |
| Licitante, lote ao vivo | sala carrega | situação + formulário com "Mínimo: R$ X. Você tem R$ Y disponíveis." e 3 atalhos |
| Visitante | sem sessão | caixa com "Entrar para dar lance" (link `/login`) |
| Leiloeiro | sessão AUCTIONEER | "Leiloeiros acompanham os lotes, mas não dão lances." |
| Lance aceito | POST 201 | item no histórico, "Lance de R$ X aceito.", campo limpo; com prorrogação, + "O fim do lote foi prorrogado em +2 min." |
| Mesmo `seq` pelo stream | evento depois (ou antes) do POST | um item só |
| Recusa com detalhe | 422 `BID_BELOW_MINIMUM` / `INSUFFICIENT_BALANCE` / `LOT_NOT_STARTED` | texto da tabela com valor ou data do detalhe |
| Integridade | 409 `LOT_INTEGRITY_FAILED` | "Lances suspensos neste lote." / "O histórico de lances não passou na verificação de integridade. Seu lance não foi registrado." |
| Campo vazio ou inválido | sem POST / 400 `VALIDATION_FAILED` | "Informe o valor do lance." |
| Lote cancelado | POST 404 | tela "Lote não encontrado" |
| Sem conexão | POST falha na rede | "Não foi possível enviar o lance. Verifique a conexão e tente de novo." |
| Lance de outro | evento `bid` | histórico, lance atual, nº de lances, `endsAt` e situação atualizam; se `endsAt` cresceu, nota "Prorrogado em +2 min pelo último lance." e "Fim previsto" com "(prorrogado)" |
| Reconexão | `open` de novo | GET do lote e do histórico mesclados pelo `seq` |

</frozen-after-approval>

## Casos de teste (aprovados)

Vitest ao lado do arquivo no front; Jest na API:
- `mergeBid`: ignora lance com `seq` já presente; lance novo vira o primeiro da lista e atualiza lance atual, nº de lances e `endsAt`; marca prorrogado quando `endsAt` cresce; lance de `seq` menor que o atual não muda lance atual nem `endsAt`.
- `mergeRoom` (GET do reconectar): une as listas pelo `seq`; não volta lance atual nem `endsAt` quando o GET é mais antigo que o último lance conhecido.
- `situationOf`: ganhando, superado e ainda não deu lance.
- `LotsService.find` (unitário): licitante recebe `me.hasBid` `true` com lance no lote e `false` sem lance.
- e2e em `api/test/realtime.e2e-spec.ts`: `GET /lots/:id` do licitante traz `hasBid` `false` antes e `true` depois do lance.
- `bidError`: um caso por código da tabela, mais integridade, validação e rede.
- `shortcuts`: mínimo é o lance inicial sem lances, e lance atual + incremento com lances; +1 e +2 incrementos.

## Code Map

- `web/src/features/live-room/use-room.ts` -- estado `ready` passa a ter `bids: BidHistoryItem[]`, `total` e `extended`; carga inicial com `Promise.all` de `api.lot` e `api.lotBids(id, 1)` (o esqueleto atual cobre os dois). `useTurn` continua igual: reage ao novo `endsAt` sozinho.
- `web/src/features/live-room/use-stream.ts` (novo) -- abre/fecha o stream pelo client; `onBid` → `mergeBid`; `onOpen` → GETs + `mergeRoom`.
- `web/src/features/live-room/room-bids.ts` (novo) + spec -- funções puras `mergeBid`, `mergeRoom`, `situationOf`, `shortcuts`, `minimumOf`.
- `web/src/features/live-room/bid-errors.ts` (novo) + spec -- `bidError(caught): { title, text, tone }`, padrão de `features/auth/auth-errors.ts`.
- `web/src/features/live-room/bid-form.tsx`, `room-status.tsx`, `room-history.tsx` (novos) -- partes do canvas; `bid-form` usa `maskAmount`/`parseAmount` de `shared/lib/money.ts` e o padrão de envio de `features/wallet/deposit-form.tsx` (`submitting`, foco no erro).
- `api/src/lots/lots.service.ts` (`find`), `dto/lot-detail.dto.ts` (`LotViewerDto.hasBid`), `lots.service.spec.ts`, `api/test/realtime.e2e-spec.ts` -- `me.hasBid` como `EXISTS` na query do detalhe (continua 1 query).
- `web/src/features/live-room/room-view.tsx` -- monta status, formulário e histórico conforme papel e status; "Fim previsto (prorrogado)".
- `web/src/features/live-room/room-timing.tsx`, `room-summary.ts` -- `countNote` ganha o caso prorrogado (com teste novo no spec existente).
- `web/src/features/live-room/room.css` -- grid do canvas: desktop `"art head" "art summary" "art status" "art form" "info history"`; ≤880px uma coluna `art, head, summary, status, form, history, info`, arco ~55vh como na 3.7, sem miniatura. Classes novas `room-*` só para as partes novas (atalhos, mensagens, histórico, caixa de visitante/leiloeiro), nunca para esqueleto/erro.
- `web/src/features/live-room/room-page.tsx` -- `RoomError` passa a usar o erro de `shared/ui`, mantendo o "Voltar à vitrine"; esqueleto com a classe base de `shared/ui`.
- `web/src/shared/api/client.ts` -- `ApiError` guarda o detalhe (`minimum`, `available`, `startsAt`); `api.placeBid(id, amount)`, `api.lotBids(id, page)`; `openLotStream(id, { onBid, onOpen }): () => void` com `EventSource` em `${baseUrl}/lots/${id}/stream`, validando o JSON do evento antes de usar.
- `web/src/shared/api/types.ts` -- já tem `PlacedBid`, `BidEvent`, `BidHistory`, `ApiErrorBody` com detalhe; `LotDetail.me` ganha `hasBid`.
- `web/src/features/wallet/wallet-provider.tsx`, `use-wallet.ts` -- `refresh()`: relê `GET /wallet` mantendo o estado atual até a resposta (erro mantém o anterior).
- Refactor: `.skel` + keyframes saem de `features/lots/lots.css` para `shared/ui/skeleton.css`; `features/auctioneer/load-error.tsx` (+ `.panel-error`) vira `shared/ui/load-error.tsx` com `children` opcional para ações extras; home, painel e sala importam de lá; `.room-skel` vira `.skel` com os modificadores atuais.
- Não mexer: API além do `me.hasBid`, `shared/lib/countdown.ts`, `.panel-skel` e as abas (ficam para a "Revisão final" do `deferred-work.md`).

## Tasks & Acceptance

**Execution:**
- [ ] `docs/stories/sprint-status.yaml` -- 4-5 `done` (feito), 4-6 `in-progress`
- [ ] `api/src/lots/*`, `api/test/realtime.e2e-spec.ts`, `web/src/shared/api/types.ts` -- commit `feat(lots)`: `me.hasBid`
- [ ] `web/src/shared/ui/*`, `features/lots`, `features/auctioneer`, `features/live-room/room-page.tsx` -- commit `refactor(web)`: esqueleto e erro em `shared/ui`
- [ ] `web/src/shared/api/client.ts`, `features/wallet/*` -- detalhe do erro, lance, histórico, stream, `refresh`
- [ ] `web/src/features/live-room/*` -- funções puras + specs, hooks, componentes e CSS
- [ ] `docs/stories/deferred-work.md` -- link "Auditar este lote" na sala para a 5.8; marcar `LOT_INTEGRITY_FAILED` como feito na 4.6
- [ ] `README.md` (comportamento da sala, se couber), `docs/ai-log.md`, decisões se houver

Commits na ordem, cada um compilando e passando sozinho, seguindo a seção Commits do `CLAUDE.md` (`Refs: story 4.6`, `npm run lint:check` antes): `chore` do sprint-status, `feat(lots)` do `hasBid`, `refactor(web)` de `shared/ui`, `feat(web)` da sala (com os docs). Sem push.

**Acceptance Criteria:**
- Given duas abas na mesma sala com licitantes diferentes, when um dá lance, then a outra atualiza histórico, lance atual, situação e contagem sem recarregar, e o resumo da carteira do superado volta o valor ao disponível.
- Given a API reiniciada com a sala aberta, when o stream reconecta, then a sala refaz os GETs e mostra os lances perdidos sem duplicar.
- Given um clique duplo em "Dar lance", when o primeiro POST está em andamento, then só um POST sai.

## Design Notes

Textos do canvas: situação "Você está ganhando" / "O valor fica reservado na sua carteira enquanto você liderar." (▲, `ag-bidstatus--winning`); "Você foi superado" / "Para cobrir, ofereça ao menos R$ X." (▼, `--outbid`); "Você ainda não deu lance neste lote."; agendado "Este lote ainda não começou. Abre em {data}." Formulário: rótulo "Seu lance", atalhos sob "Preencher com:" mostrando os valores, botão "Dar lance". Visitante: "Você pode acompanhar este lote ao vivo. Para dar lance, entre com uma conta de licitante." Recusas com título + texto ("Lance abaixo do mínimo." / "O mínimo agora é R$ X."; "Saldo insuficiente." / "Seu disponível é R$ X."; "Este lote ainda não começou." / "Abre em {data}."; "Este lote não aceita mais lances."); `ALREADY_WINNING` em tom informativo. Histórico: "Histórico de lances (N)" com `total`, linhas quem/valor/hora `HH:MM:SS`, "Você" destacado, "▲ Lidera" só na primeira; vazio "Ainda não há lances" / "O primeiro lance precisa ser de pelo menos R$ X. Seja o primeiro."; rodapé "Os participantes aparecem só por apelido. Todo lance fica registrado e pode ser conferido na auditoria pública." Sem paginação: a página 1 e os lances que chegam.

Mescla pelo `seq`: o maior `seq` conhecido manda no lance atual, no `bidCount` e no `endsAt`; GET mais antigo só acrescenta itens que faltam.

## Verification

**Commands:**
- `cd api && npm run lint:check && npm test --silent && npm run build && npm run test:e2e` -- expected: verde
- `cd web && npm run lint:check && npm test -- --silent && npm run build` -- expected: verde

**Manual checks:**
- Duas abas (licitante A e B) num lote do seed: lances cruzados, recusas, prorrogação perto do fim, reconexão derrubando a API. Conferir em 360, 768, 1024 e 1280px.

## Implementation Notes

## Spec Change Log

## Review Triage Log
