---
title: 'Tela Página inicial (vitrine)'
type: 'feature'
created: '2026-10-27'
status: 'ready-for-dev'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/stories/epic-3-context.md'
  - '{project-root}/docs/design/Main.dc.html'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** a API da vitrine e do destaque (3.3) está pronta, mas `/` ainda mostra só o título "Vitrine": o visitante não vê o lote em destaque, não navega pelas abas nem busca lotes.

**Approach:** página em `features/lots` seguindo o canvas **Página inicial** e as classes `ag-*`: destaque, vitrine com abas, busca e paginação, e a faixa "Como funciona". Sem mudar a API.

## Boundaries & Constraints

**Always:**
- Número do lote sempre com `lotLabel` ("Lote VII · nº 7", D-054). Valores com `formatMoney` (centavos, D-048). Datas no fuso do navegador: agendado "24 out, 19h" (`formatShortDate`), encerrado "20 out" (novo `formatDay`).
- Imagens só de `lotImageUrl(id)`, dentro do nicho em arco do canvas (imagem inteira, `object-fit: contain`, moldura dourada única como a `.panel-niche-image`: o card não traz o tipo da peça).
- **Destaque:** `GET /lots/featured` uma vez ao montar; com 200, `GET /lots/:id` do mesmo id para descrição, aumento mínimo, nº de lances e `serverTime`. 204, 404 no detalhe ou status `ended` → o bloco some. Nunca refaz a busca por troca de aba, busca ou tempo; só "Tentar de novo" no erro (pode trazer outro lote). Ao vivo: sobretítulo "Em destaque agora", selo Ao vivo, preço "Lance atual"/"Lance inicial", "+ R$ X" de aumento, lances, contagem regressiva `ag-countdown` (Min:Seg, ou Horas:Min a partir de 1h; `--urgent` abaixo de 2 min; para em 00:00), nota "Lances nos últimos 2 minutos somam 2 minutos ao fim.", botão "Entrar na sala do lote". Agendado: "Próximo leilão", selo Agendado, "Abre em {data}", botão "Ver o lote". Descrição nula → sem parágrafo. Carregando: esqueleto; erro: aviso + "Tentar de novo".
- **Relógio:** diferença `serverTime − hora do cliente` medida no detalhe do destaque corrige as contagens do destaque e dos cards; sem destaque, diferença zero. Um único timer de 1s na página.
- **Vitrine:** abas Ao vivo (padrão), Agendados, Encerrados como botões `aria-pressed`, cada uma com "(N)" de `counts` (a busca já entra na contagem). Trocar de aba volta à página 1 e mantém a busca. 12 por página com Anterior/Próxima (o `Pager` do painel vai para `shared/ui`, limite de 100 páginas).
- **Card:** `lotLabel`, selo, título como link para `/lots/:id` cobrindo o card (`.lot-link::after`), artista, preço e tempo. Ao vivo: "Lance atual"/"Lance inicial"; "Encerra em" + "14:32" ou "1h 05min", "Últimos minutos" + `ag-lot__time--urgent` abaixo de 2 min, "Status" + "Encerrando" em zero. Agendado: "Lance inicial", "Abre em {data}". Encerrado: "Arrematado por R$ X" ou "Resultado / Sem lances", "Encerrado em {dia}".
- **Busca:** campo "Buscar na vitrine" (`type="search"`, máx. 100 caracteres, placeholder "Obra, artista ou lote"), busca ao digitar com espera de 300 ms; volta à página 1. Termo sem espaços nas pontas. Viram `number` (decisão do usuário): só dígitos, com ou sem prefixo "lote "; romano canônico em maiúscula ("VII"); romano em qualquer caixa só com o prefixo "lote " em qualquer caixa ("lote vii", "Lote VII"). Romano lido por novo `fromRoman` (só maiúsculas; `null` se `toRoman(n) !== termo`). Todo o resto vai como `q`: palavra solta em minúscula como "di" ou "mix" é texto, porque o acervo tem nomes como "Agnolo di Cosimo". `number` fora de 1..2147483647 mostra "Nenhum lote encontrado" sem chamar a API.
- **Estados da vitrine:** carregando (4 esqueletos + `sr-only` "Carregando lotes da vitrine."), erro "Não foi possível carregar a vitrine" + texto do canvas + "Tentar de novo", aba vazia sem busca com título, texto e botão do canvas ("Ver agendados" / "Ver lotes ao vivo"), sem resultado com busca: aviso "Nenhum lote encontrado" + "Limpar busca" (limpa o campo e refaz a lista).
- Grid de cards e esqueletos com `repeat(auto-fill, minmax(250px, 1fr))`, igual ao painel: com poucos resultados os cards não esticam e sobra espaço à direita (decisão do usuário, substitui o pedido inicial de preencher a linha). O grid da busca do painel (3.5) não muda.
- Card e destaque levam a `/lots/:id`. Até a 3.7, rota provisória em `features/live-room/room-page.tsx` com o título "Sala do lote", que a 3.7 substitui: o Render publica a main a cada merge (D-034), então nenhum link pode cair na tela de erro do roteador.
- "Como funciona": faixa escura com os quatro passos e textos do canvas. Responsivo a partir de 360px.

**Casos de teste (aprovados pelo usuário):** `roman.spec.ts`: (17) `fromRoman` lê VII, XIV e MMMCMXCIX; (18) `fromRoman` recusa romano fora do padrão (IIII, VX, IC). `date.spec.ts`: (19) `formatDay` mostra "20 out". `countdown.spec.ts` (`shared/lib`): (20) mostra "14:32" abaixo de 1h; (21) mostra "1h 05min" a partir de 1h; (22) corrige o tempo restante pela diferença do `serverTime`; (23) não fica negativo depois do fim. `showcase-search.spec.ts` (`features/lots`): (24) "7" vira `number`; (25) "VII" vira `number`; (26) "lote VII" vira `number`; (27) texto vira `q`; (28) "0" e número acima do teto não viram busca; (29) "lote vii" vira `number`; (30) "di" e "mix" viram `q`. O critério de moeda já está coberto pelo `money.spec.ts`.

**Never:** mudar a API; "ganhando/superado", tempo real (épico 4); seção Auditoria, links "Auditar este lote" e campo de auditoria (épico 5); mexer no cabeçalho ou criar rodapé; imagem do CDN; dependência nova.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Sem destaque | featured 204 | bloco some, vitrine normal | N/A |
| Destaque some no meio | detalhe 404 | bloco some | N/A |
| Busca por número | "7", "VII", "lote VII", "lote vii" | `number=7` | N/A |
| Minúscula solta | "di", "mix", "vii" | vai como `q` | N/A |
| Busca por texto | "Rembrandt" | `q=Rembrandt` | N/A |
| Número impossível | "0", "99999999999" | "Nenhum lote encontrado", sem chamada | N/A |
| Sem resultado | busca com `total=0` | aviso + "Limpar busca" | N/A |
| API fora | lista falha | aviso + "Tentar de novo" | qualquer `ApiError` |

</frozen-after-approval>

## Code Map

- `web/src/features/lots/home-page.tsx` -- hoje só o título; vira a página.
- `web/src/shared/api/client.ts` -- acrescentar `lots(status, page, filter)` (`GET /lots?status&page&q|number`), `featured()` (204 → `undefined`, o `request` já trata) e `lot(id)` (`GET /lots/:id`). `types.ts` já tem `LotCard`, `LotShowcase`, `LotDetail`, `LotStatus`; `lotImageUrl` já existe.
- API (só leitura): `GET /lots` (`ListLotsQueryDto`: `status` padrão `live`, `q` ≤ 100, `number` só dígitos 1..2147483647, `page` 1..100; 12 por página; `counts` por aba), `GET /lots/featured` (`LotCard` ou 204), `GET /lots/:id` (`LotDetail` com `serverTime`; 404 se cancelado).
- `web/src/shared/lib/roman.ts` (`toRoman`, `lotLabel`), `date.ts` (`formatShortDate`), `money.ts` (`formatMoney`) -- reaproveitar; `fromRoman`, `formatDay` e o novo `countdown.ts` entram aqui com specs (vitest, `TZ` fixo em `vite.config.ts`).
- `web/src/features/auctioneer/pager.tsx` + `.panel-pager`/`.panel-muted` em `auctioneer.css` -- mover para `shared/ui/pager.tsx` + `pager.css` (commit `refactor` separado), atualizando os imports do painel.
- `web/src/features/auctioneer/load-error.tsx`, `use-dashboard.ts` (`Load<T>`, padrão `active` contra resposta atrasada) -- copiar o padrão; não importar de `auctioneer`.
- `web/src/shared/ui/bundle.css` -- `ag-lot*`, `ag-badge--live|scheduled|closed`, `ag-countdown*`, `ag-section*`, `ag-notice*`, `ag-meander--light`. Classes locais do canvas (`niche`, `lot-card`, `lot-link`, `skel`) vão para `features/lots/lots.css` com tokens.
- `web/src/app/router.tsx` -- rota pública provisória `/lots/:id` dentro do `Layout`, apontando para `features/live-room/room-page.tsx`.

## Tasks & Acceptance

**Execution:**
- [x] `docs/stories/sprint-status.yaml` -- 3.5 done (feito); 3.6 in-progress ao implementar.
- [ ] `web/src/shared/lib/roman.ts`, `date.ts`, `countdown.ts` + specs -- helpers e casos aprovados.
- [ ] `web/src/shared/ui/pager.tsx`, `pager.css` -- mover o `Pager` (refactor).
- [ ] `web/src/shared/api/client.ts` -- `lots`, `featured`, `lot`.
- [ ] `web/src/features/lots/` -- `showcase-search.ts` + spec, `use-showcase.ts`, `use-featured.ts`, `featured.tsx`, `showcase.tsx`, `lot-card.tsx`, `how-it-works.tsx`, `lots.css`, `home-page.tsx`.
- [ ] `web/src/features/live-room/room-page.tsx`, `web/src/app/router.tsx` -- rota provisória "Sala do lote".
- [ ] `README.md` (Comportamentos esperados: destaque não troca de lote na página), `docs/ai-log.md`.

**Acceptance Criteria:**
- Given um visitante em `/`, when a página carrega, then vê destaque, vitrine na aba Ao vivo com as três contagens e "Como funciona".
- Given a vitrine aberta, when outro lote passa a ter o maior lance, then o destaque continua no mesmo lote até recarregar.
- Given a tela em 360px, when se percorre destaque, abas, busca, cards e "Como funciona", then não há rolagem horizontal.
- Given qualquer card ou o destaque, when se inspeciona a imagem, then a URL é `/lots/:id/image` da API.

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Verification

**Commands:**
- `cd web && npm run lint:check && npm test && npm run build` -- expected: verde.

**Manual checks:**
- Com compose e seed: destaque ao vivo com contagem; abas e contagens; buscar "7", "VII" e um título; sem resultado → "Limpar busca"; derrubar a API → erro com "Tentar de novo"; 360px no devtools.
