---
title: 'Tela Sala do lote ao vivo (leitura)'
type: 'feature'
created: '2026-10-27'
baseline_commit: '0d135985039573f2a35092230a7dbd57be6c4c5b'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/stories/epic-3-context.md'
  - '{project-root}/docs/design/Sala.dc.html'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** cards, destaque e painel já apontam para `/lots/:id`, mas a rota ainda é a página provisória da 3.6, só com o título "Sala do lote": o visitante não vê a obra, as condições nem o tempo restante.

**Approach:** sala de leitura em `features/live-room` seguindo o canvas **Sala do lote ao vivo** e as classes `ag-*`, a partir de `GET /lots/:id`. Sem mudar a API. O livro do painel ganha "Abrir sala".

## Boundaries & Constraints

**Always:**
- Número com `lotLabel` (D-054), valores com `formatMoney` (D-048), datas no fuso do navegador com `formatShortDate`.
- Contagem com `clockOffset`/`secondsLeft`/`splitLeft` de `shared/lib/countdown.ts` (offset medido no `serverTime` do `GET`); nenhum helper de tempo novo. Um timer de 1s só com o lote ao vivo.
- **Layout sem os blocos do épico 4:** desktop em duas colunas, obra no nicho à esquerda e, à direita, cabeçalho, resumo e "Sobre a obra e o lote" (áreas `"art head" "art summary" "art info"`). Abaixo de 880px (decisão do usuário, mesmo padrão do destaque da página inicial): obra primeiro, com o arco limitado a ~55vh, depois cabeçalho, resumo e "Sobre"; sem miniatura no cabeçalho. Nenhum espaço reservado para lance, situação ou histórico.
- **Cabeçalho:** selo (Ao vivo / Agendado / Encerrado), `lotLabel`, título em `h1`, linha "artista, data · técnica" só com as partes não vazias.
- **Resumo** (`.summary`): rótulo "Lance atual" (ao vivo com lance), "Lance vencedor" (encerrado com lance) ou "Lance inicial" (sem lance), valor, e linha "N lances" / "1 lance" / "Nenhum lance ainda" (ao vivo ou agendado sem lance) / "Sem lances" (encerrado sem lance). Ao vivo e encerrado: `ag-countdown` (Min:Seg, Horas:Min a partir de 1h) com nota "Lances nos últimos 2 minutos estendem o fim em +2 min."; abaixo de 2 min `--urgent` e "Últimos minutos: um lance agora estende o fim em +2 min."; encerrado 00:00 e "Lote encerrado.". Agendado: bloco "Abre em {data}" + "Os lances só são aceitos a partir daí.", sem contagem.
- **Virada de estado com a página aberta:** quando o relógio corrigido passa de `startsAt` (agendado) ou `endsAt` (ao vivo), refaz o `GET /lots/:id` uma vez, sem esqueleto, e o status vem da API. O front não calcula status.
- **Sobre a obra e o lote:** descrição (se houver) e `dl` com Artista, Data, Técnica, Dimensões (só os não vazios), Lance inicial, Aumento mínimo, Início, Fim previsto.
- Imagem só de `lotImageUrl(id)`, no nicho (`object-fit: contain`, moldura como na 3.6).
- **Estados:** carregando (esqueleto do canvas só com cabeçalho, resumo e obra + `sr-only` "Carregando a sala do lote."); 404 ou id que não é inteiro positivo (sem chamar a API) → "Lote não encontrado" com o texto do canvas e "Voltar à vitrine"; outro erro → aviso "Não foi possível abrir a sala do lote" + "Tentar de novo" e "Voltar à vitrine". Responsivo a partir de 360px.
- **Painel:** na coluna Ação do livro, link `ag-btn--quiet` "Abrir sala" para `/lots/:id` em todo lote não cancelado (ao vivo, agendado e encerrado), sumindo durante a confirmação de cancelamento (decisão do usuário).
**Casos de teste (aprovados pelo usuário):** `room-summary.spec.ts` (`features/live-room`): (31) ao vivo sem lance mostra "Lance inicial"; (32) ao vivo com lance mostra "Lance atual"; (33) encerrado com lance mostra "Lance vencedor"; (34) encerrado sem lance mostra "Sem lances"; (35) nota fica de "Últimos minutos" abaixo de 2 min; (36) id não numérico não vira busca na API. A correção pelo `serverTime` já está coberta pelo caso (22) do `countdown.spec.ts`.

- `room-page.tsx` provisória é substituída; a rota em `router.tsx` continua pública.

**Never:** mudar a API; formulário de lance, situação do licitante, histórico, "Auditar este lote", SSE e "prorrogado" (épicos 4 e 5); mexer no cabeçalho do app; imagem do CDN; dependência nova.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Ao vivo sem lance | `currentBid` nulo | "Lance inicial", "Nenhum lance ainda", contagem | N/A |
| Relógio do cliente adiantado | `serverTime` 5 min atrás do cliente | contagem pelo relógio do servidor | N/A |
| Fim com a página aberta | contagem chega a 0 | um novo `GET`; vira Encerrado | erro no refetch mantém a tela atual |
| Cancelado ou inexistente | 404 | "Lote não encontrado" | N/A |
| Id inválido | `/lots/abc`, `/lots/0` | "Lote não encontrado", sem chamada | N/A |
| API fora | erro ≠ 404 | aviso + "Tentar de novo" | qualquer `ApiError` |

</frozen-after-approval>

## Code Map

- `web/src/features/live-room/room-page.tsx` -- provisória; vira a sala. Novos: `use-room.ts` (`Load` com `active` contra resposta atrasada, `retry`, refetch silencioso), `room-summary.ts` + spec, `room.css` (classes locais do canvas: `room`, `a-*`, `summary`, `price`, `dl`, nicho da sala).
- `web/src/shared/api/client.ts` -- `api.lot(id)`, `lotImageUrl(id)`, `ApiError` (`status` 404; 0 = rede). Já existem.
- `web/src/shared/api/types.ts` -- `LotDetail` (`description`, `measurements`, `serverTime`...). Sem mudança.
- `web/src/shared/lib/countdown.ts`, `date.ts`, `money.ts`, `roman.ts` -- reaproveitar.
- `web/src/features/lots/featured.tsx` + `lots.css` -- referência de nicho, `skel`, `ag-countdown` e erro; `.niche`/`.skel` vivem em `lots.css`: copiar para `room.css` com prefixo próprio, não importar de `features/lots`.
- `web/src/features/auctioneer/ledger-row.tsx` (`Action`) -- acrescentar "Abrir sala".
- `web/src/shared/ui/bundle.css` -- `ag-badge--*`, `ag-countdown*`, `ag-lot__label`, `ag-notice*`, `ag-rule`, `ag-btn*`.

## Tasks & Acceptance

**Execution:**
- [x] `docs/stories/sprint-status.yaml` -- 3.6 done (feito); 3.7 in-progress ao implementar.
- [x] `web/src/features/live-room/` -- `room-summary.ts` + spec, `use-room.ts`, `room-page.tsx` (e componentes da sala), `room.css`.
- [x] `web/src/features/auctioneer/ledger-row.tsx` -- "Abrir sala" (commit separado).
- [x] `docs/stories/deferred-work.md` -- marcar o item do "Abrir sala" como feito na 3.7.
- [x] `README.md` (se algo mudou em Comportamentos esperados), `docs/ai-log.md`.

**Acceptance Criteria:**
- Given um lote existente em `/lots/:id`, when a sala carrega, then mostra cabeçalho, lance atual ou inicial, contagem (ou "Abre em") e "Sobre a obra e o lote", sem blocos vazios.
- Given um card, o destaque ou "Abrir sala" no painel, when clicado, then abre a sala do mesmo lote.
- Given a sala em 360px, when percorrida, then não há rolagem horizontal.

## Implementation Notes

## Spec Change Log

## Review Triage Log

| # | Achado | Veredito | Evidência | Rota |
|---|--------|----------|-----------|------|
| 1 | `use-room.ts`: refetch da virada que falha ou ainda devolve o status antigo não tenta de novo; a sala fica em 00:00 "Ao vivo" | low | Real, mas é o comportamento aprovado: "refaz o GET uma vez" e "erro no refetch mantém a tela atual" (matriz). Recarregar corrige. | rejeitado |
| 2 | `use-room.ts`: 404 no refetch da virada (lote cancelado com a página aberta) é ignorado e a sala segue mostrando o lote | low | Real: o handler de erro descarta tudo; correção direta de uma condição. | patch |
| 3 | `room-timing.tsx`: em 00:00, antes do refetch, a nota ainda diz "um lance agora estende o fim" | low | Real só na janela de ~500 ms + latência; trocar a nota por "encerrado" seria o front decidir o status, o que a spec proíbe. | rejeitado |
| 4 | `use-room.ts`: `Date.parse` com NaN dispararia GETs em loop | false | `startsAt`/`endsAt` vêm de `timestamptz` serializado em ISO pela API; data inválida não chega ao front. | rejeitado |
| 5 | `room-view.tsx`: imagem quebrada se `GET /lots/:id/image` falhar | low | Mesmo achado rejeitado na 3.6 (#3): a imagem é snapshot criado junto com o lote; só falha por rede. | rejeitado |
| 6 | `room-summary.ts`: `/lots/014` mostra "não encontrado" | low | Nenhum link do app gera id com zero à esquerda; URL digitada à mão. | rejeitado |

## Verification

**Commands:**
- `cd web && npm run lint:check && npm test && npm run build` -- expected: verde.

**Manual checks:**
- Com compose e seed: lote ao vivo com contagem; agendado com "Abre em"; encerrado; `/lots/999999` e `/lots/abc` → não encontrado; API derrubada → erro com "Tentar de novo"; "Abrir sala" no painel; 360, 768, 1024 e 1280px.
