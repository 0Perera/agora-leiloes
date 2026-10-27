---
title: 'Tela Painel do leiloeiro'
type: 'feature'
created: '2026-10-26'
status: 'done'
baseline_commit: '051d6a59641f3ac2f172e11fbb71e54e0f60090d'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/stories/epic-3-context.md'
  - '{project-root}/docs/design/Painel.dc.html'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** a API do painel (3.1, 3.2, 3.4) está pronta, mas `/dashboard` ainda é um placeholder: o leiloeiro não busca no acervo, não cria nem cancela lotes e não vê o resumo pelo navegador.

**Approach:** tela em `features/auctioneer` seguindo o canvas **Painel do leiloeiro** e as classes `ag-*`: resumo, seção "Novo lote a partir do acervo" (busca + ficha) sempre visível logo abaixo do resumo, e livro de lotes com filtros, paginação e cancelamento na linha.

## Boundaries & Constraints

**Always:**
- Todo valor com centavos via `formatMoney`/`maskAmount`/`parseAmount` (D-048). Campos de valor com a máscara de maquininha da carteira.
- Número do lote nunca aparece antes da criação: a ficha se chama "2. Ficha do lote", sem número. O número aparece só na janela de confirmação, com o `number` devolvido pelo `POST /lots` (nova decisão D-053, substitui o trecho do critério da ficha).
- Número do lote sempre como "Lote DXXXVII · nº 537" (no livro, romano com "nº 537" abaixo); acima de 3999, só o número comum (D-054, substitui a D-036).
- Busca: campo + seletor de departamento (D-050, European Painting and Sculpture padrão, Greek and Roman Art) + "Buscar"; termo vazio → erro de campo sem chamar a API. Estados do canvas: carregando (6 esqueletos), vazio, erro "O acervo do museu não respondeu" com "Tentar de novo", resultados em cartões-botão (`aria-pressed`) com imagem do CDN, título, artista e tipo; paginação Anterior/Próxima quando `total > pageSize`.
- Ficha: título, artista, data, técnica, tipo e imagem só leitura (cadeado + texto do canvas); editáveis só lance inicial, aumento mínimo, início e fim (`datetime-local`, hora local convertida para ISO UTC). Validação por campo antes do envio, com as faixas da API: valores de R$ 1,00 até R$ 10.000.000,00 (lance) e R$ 1.000.000,00 (aumento); início não mais que 1 min no passado; fim depois do início. Resumo "Corrija N campos para publicar o lote." Erros da API traduzidos: `VALIDATION_FAILED` por campo, `IMAGE_DOWNLOAD_FAILED` → "O lote não foi criado." + texto do canvas, `ARTWORK_ALREADY_LISTED` (mensagem já em `lot-errors.ts`), `CATALOG_UNAVAILABLE`, conexão.
- Depois de criar: janela modal (`<dialog>` com `showModal`, moldura com cantoneiras como a ficha) com título "Lote VI · nº 6 publicado", miniatura e título da obra, estado e abertura ("Agendado, abre em 28 out, 19h") e os botões "Ver no livro" (fecha, rola até a linha do lote e põe o foco nela) e "Criar outro lote" (fecha e leva o foco para a busca). Esc fecha e devolve o foco à busca; em 360px a janela ocupa a largura com 16px de margem. O livro volta para Todos, página 1, e o resumo recarrega; a ficha e a obra selecionada só são limpas quando a janela fecha.
- Ao fechar a janela, a linha do lote novo fica com fundo dourado claro que some em 4s; com `prefers-reduced-motion: reduce`, o fundo fica fixo e sai junto com o timer.
- Coluna Nº do livro centralizada na vertical e na horizontal, alinhada com o cabeçalho. Cartões da busca com `repeat(auto-fill, minmax(200px, 1fr))`.
- Resumo com 3 cartões (Ao vivo + "R$ X em lances agora", Agendados + "Próximo: {data}" ou "Nenhum agendado", Encerrados + "N fecharam sem lances"). Sem "Total recebido" (épico 5).
- Livro: filtros com contagem, 20 por página com Anterior/Próxima, colunas Nº (romano), Obra (miniatura de `GET /lots/:id/image`, título, artista), Estado, Lance inicial, Resultado, Lances, Período, Ação. Resultado sem alias nem arrematante: ao vivo/encerrado com lance → "R$ {currentBid}" + "lance atual"/"maior lance"; sem lance → "Sem lances"; agendado → "Aguardando". Cancelado com o carimbo "Cancelado" e "Fora da vitrine."
- "Cancelar lote" só em agendado ou ao vivo com `bidCount = 0`; confirmação na linha "Tirar o lote da vitrine?" / "Sim, cancelar" / "Manter". 204 → recarrega livro e resumo. `LOT_HAS_BIDS` → aviso "Cancelamento recusado" do canvas e recarrega; `LOT_ENDED` e 404 → aviso e recarrega.
- Estados carregando, vazio (livro vazio com "Busque uma obra no acervo para criar seu primeiro lote.", sem botão; vazio por filtro) e erro com "Tentar de novo" no resumo, no livro e na busca. Responsivo a partir de 360px (livro vira cartões com `data-label`, ficha em uma coluna).
- Sem link "Criar lote" no cabeçalho nem modo separado de criação: busca e ficha ficam no próprio painel.
- Helpers novos com teste em `shared/lib`: `toRoman` (só ida, `null` fora de 1 a 3999; a leitura do romano entra na story que usar primeiro) e `lotLabel` e datas (`24 out, 19h` no fuso do navegador, o mesmo dos campos de início e fim; `datetime-local` ↔ ISO). Os testes fixam `TZ=America/Sao_Paulo` na config do vitest, não no código. Licitante/visitante já são redirecionados por `RequireRole`.
- Ficha sem Dimensões e Nº no acervo: a busca não devolve esses campos e a API não muda (decisão do usuário).

**Casos de teste (aprovados pelo usuário):** `roman.spec.ts`: (1) converte 1, 4, 9, 14, 40, 90, 400 e 3999 para romano; (15) `lotLabel` mostra o romano com o número comum ao lado; (16) `lotLabel` mostra só o número comum acima de 3999. `date.spec.ts`: (4) formata a data curta `24 out, 19h` e `24 out, 19h30` (com o `TZ` fixo do vitest); (5) converte `datetime-local` para ISO UTC e volta. `lot-form.spec.ts` (`validateLot`): (6) recusa lance inicial vazio; (7) recusa lance acima do teto; (8) recusa início mais de 1 min no passado; (9) recusa fim antes ou igual ao início; (10) devolve centavos e ISO para ficha válida. `lot-errors.spec.ts`: (11) traduz `IMAGE_DOWNLOAD_FAILED`; (12) traduz `VALIDATION_FAILED` por campo; (13) traduz `LOT_HAS_BIDS`; (14) traduz `LOT_ENDED`.

**Never:** mostrar o próximo número; mudar a API; total recebido, arrematante, alias, "Abrir sala" ou "Ver comprovante" (3.7 e épico 5); regra de negócio nova no front (ex.: aumento ≤ lance inicial); dependência nova; imagem de lote do CDN.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Criar | ficha válida | faixa "Lote {romano} publicado…", ficha limpa, livro e resumo recarregados | N/A |
| Ficha inválida | lance vazio, fim ≤ início, início no passado | erro em cada campo, nenhuma chamada | por campo |
| Imagem | API 502 | "O lote não foi criado…", ficha mantida | `IMAGE_DOWNLOAD_FAILED` |
| Acervo fora | busca 503 | aviso do canvas + "Tentar de novo" | `CATALOG_UNAVAILABLE` |
| Cancelar | sem lances, confirma | linha vira Cancelado | N/A |
| Lance chegou | 409 | "Cancelamento recusado", livro recarregado | `LOT_HAS_BIDS` |

</frozen-after-approval>

## Code Map

- `web/src/features/auctioneer/dashboard-page.tsx` -- hoje placeholder; vira a página (título "Painel do leiloeiro", sobretítulo "Livro da casa", lede, botão "Novo lote"/"Fechar novo lote" com `aria-expanded`).
- `web/src/features/auctioneer/lot-errors.ts` -- já traduz `ARTWORK_ALREADY_LISTED`; ampliar para os códigos acima e `fields`.
- `web/src/features/wallet/deposit-form.tsx`, `deposit.ts`, `wallet.css`, `wallet-page.tsx` -- modelo de campo com máscara, `FieldError`, aviso `ag-notice`, esqueletos `sr-only`+`aria-hidden`, `wallet-corners`. Copiar padrão, não importar CSS da carteira.
- `web/src/shared/api/client.ts` -- acrescentar `catalogSearch`, `createLot`, `dashboardLots`, `dashboardSummary`, `cancelLot` (204 sem corpo: `request` hoje sempre faz `response.json()`; tratar 204). `types.ts` já tem `CatalogSearch`, `CreateLotRequest`, `CreatedLot`, `DashboardBook`, `DashboardSummary`; acrescentar `CatalogDepartment` já existe.
- `web/src/shared/lib/money.ts` -- reaproveitar; novos `roman.ts` (`toRoman`) e `date.ts` (+ specs, vitest).
- `web/src/shared/ui/field-error.tsx`, `field.css` (`.is-invalid`), `app/app.css` (`.sr-only`) -- reaproveitar.
- API (só leitura): `GET /catalog/search?q&department&page` (12 por página), `POST /lots` (`CreateLotDto`: centavos 100..1e9 e 100..1e8; `fields` `startsAt: notInPast`, `endsAt: afterStart|notInPast`, `artworkId: notFound`), `GET /dashboard/lots?status&page`, `GET /dashboard/summary`, `POST /lots/:id/cancel` (204), `GET /lots/:id/image`.

## Tasks & Acceptance

**Execution:**
- [x] `docs/stories/sprint-status.yaml` -- 3.4 done (feito), 3.5 in-progress.
- [x] `web/src/shared/lib/roman.ts`, `date.ts` + specs -- helpers.
- [x] `web/src/shared/api/client.ts` -- métodos e 204.
- [x] `web/src/features/auctioneer/` -- `use-dashboard.ts` (resumo + livro, reload), `summary.tsx`, `ledger.tsx` (+ linha e confirmação de cancelamento), `catalog-search.tsx`, `lot-form.tsx` + `lot-form.ts` (validação pura) + spec, `lot-errors.ts` + spec, `auctioneer.css`, `dashboard-page.tsx`.
- [x] `docs/decisions.md` -- D-053 (número só na confirmação) e D-054 (romano com o número comum, substitui a D-036).
- [x] `README.md` (Comportamentos esperados: número do lote só depois de criar), `docs/ai-log.md`.

**Acceptance Criteria:**
- Given um leiloeiro em `/dashboard`, when a página carrega, then vê resumo e livro com os 5 filtros e paginação.
- Given a tela em 360px, when se percorre resumo, busca, ficha e livro, then não há rolagem horizontal.

## Implementation Notes

- Validação pura em `lot-validation.ts` (+ `lot-validation.spec.ts`), não `lot-form.ts`: com `lot-form.ts` e `lot-form.tsx` lado a lado, o componente precisava importar com a extensão `.tsx`. Mesmo padrão da carteira (`deposit.ts` + `deposit-form.tsx`).
- Dica da busca com exemplos em inglês ("portrait, marble, Rome"): a Cleveland só encontra termos em inglês.
- Livro vira cartões abaixo de 1180px (canvas: 1080px): entre 1080 e 1230px a tabela gerava rolagem horizontal.
- Datas da ficha começam em amanhã 19h–21h, como no canvas; valores começam vazios.
- Pedido do usuário depois da revisão: datas exibidas passaram para o fuso do navegador, igual aos campos; `TZ=America/Sao_Paulo` fixado em `web/vite.config.ts` (`test.env`). Conferido: sem essa config o `date.spec.ts` falha em `TZ=UTC`; com ela passa em UTC e `Asia/Tokyo`.
- Linhas da matriz sem teste automático (criar, acervo fora, cancelar): sem biblioteca de teste de componente (seria dependência nova). As traduções de erro têm teste (11–14); o fluxo foi conferido com curl contra a API do compose. Navegador real e 360px ainda não conferidos.
- Dados de teste deixados no banco de dev pelo subagente (usuário `leiloeiro35@example.com` e os lotes dele): apagados com autorização do usuário.
- Pedidos do usuário depois da conferência no navegador (2026-10-27): seletor de departamento trocado por dois botões de opção (a lista do `<select>` nativo não aceita CSS); número do lote como "Lote DXXXVII · nº 537" (D-054), coluna Nº do livro passou para 96px e o livro vira cartões abaixo de 1220px; busca sempre visível, sem botão "Novo lote" nem link "Criar lote" no cabeçalho; estado vazio sem botão; depois de criar, ficha fechada e livro em Todos, página 1. Casos (15) e (16) acrescentados ao `roman.spec.ts` para o `lotLabel`, avisados ao usuário.
- Segunda leva de pedidos do usuário (2026-10-27): coluna Nº centralizada; faixa de sucesso trocada pela janela modal `created-dialog.tsx` (`<dialog>` nativo: o `showModal` deixa o resto da página inerte e trata o Esc; a `.panel-corners` põe `position: relative`, então a janela redefine `position: fixed`); destaque da linha nova (`Fresh` em `ledger-row.tsx`, timer de 4s em `dashboard-page.tsx`); busca com `minmax(200px, 1fr)`. Com `auto-fill`, poucos resultados deixam colunas vazias à direita (1 resultado em 1240px ocupa 1 de 5 colunas): avisado ao usuário. Não conferido em navegador pelo agente (sem navegador com sessão disponível).
- Terceiro pedido (2026-10-27): departamento numa lista suspensa própria (`department-picker.tsx`, padrão listbox: setas, Home/End, Enter, Esc, Tab e clique fora fecham), no lugar dos dois botões; a lista do `<select>` nativo continua descartada por não aceitar o visual da casa. Anel de foco azul do controle só com teclado (`:focus-visible`); o clique do mouse não deixa mais a borda azul.

## Spec Change Log

## Review Triage Log

| # | Achado (edge-case-hunter) | Veredito | Evidência / rota |
|---|---|---|---|
| 1 | livro com mais de 2000 lotes deixa "Próxima" chegar à página 101; a API recusa com 400 | low | real e de correção direta: patch, o `Pager` limita a 100 páginas (vale para busca e livro) |
| 2 | `VALIDATION_FAILED` só com campos desconhecidos falha em silêncio | false | a API só devolve `artworkId`, `startingBid`, `increment`, `startsAt`, `endsAt`, todos tratados |
| 3 | 500/403 na criação mostra "Não foi possível conectar" | low | real, mas raro e igual ao padrão da carteira (`depositError`); corrigir pede mensagem nova. Rejeitado |
| 4 | 500/403 no cancelamento mostra "Não foi possível conectar" | low | mesmo motivo do 3. Rejeitado |
| 5 | campo ou regra com nome de chave do `Object.prototype` | false | a API nunca devolve esses nomes |
| 6 | relógio do cliente adiantado bloqueia início que o servidor aceitaria | low | exige relógio mais de 1 min adiantado; a validação antes do envio é pedida na intenção. Rejeitado |
| 7 | pedir cancelamento de outra linha com um cancelamento em andamento | low | só fecha a confirmação antes da hora; o livro recarrega no fim. Rejeitado |
| 8 | romano para 0, negativo ou acima de 3999 | low | a sequência começa em 1; 4000 lotes é improvável no escopo. Rejeitado |
| 9 | `formatShortDate` com ISO inválido lança `RangeError` | false | todas as datas vêm da API em ISO válido |
| 10 | aviso "Cancelamento recusado" continua ao trocar de página | low | real e de correção direta: patch, `turn` limpa o aviso como `choose` |
| 11 | spec cita `lot-form.ts`/`lot-form.spec.ts`, que não existem | low | correção seria editar a spec: rejeitado; renomeação registrada nas Implementation Notes e no ai-log |

## Verification

**Commands:**
- `cd web && npm run lint:check && npm test && npm run build` -- expected: verde.

**Manual checks:**
- Com compose: buscar, criar lote (faixa com romano), forçar erro de validação, cancelar, ver o livro mudar; conferir 360px no devtools.
