---
title: 'Tela Auditoria do lote e campo da página inicial'
type: 'feature'
created: '2026-10-27'
status: 'done'
baseline_commit: '16a6b35323fb17d8e8e33f364be9a5c0be223660'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/stories/epic-5-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** a API já audita a cadeia de lances (5.5), mas ninguém consegue ver o resultado: não existe `/lots/:id/audit` no front, a página inicial não tem o campo de auditoria e nenhuma tela leva até ela.

**Approach:** criar a tela pública da auditoria seguindo `docs/design/Auditoria.dc.html`, o bloco "Leilões que qualquer pessoa pode conferir" da página inicial seguindo `docs/design/Main.dc.html`, e os links "Auditar este lote" nas telas que já existem.

## Boundaries & Constraints

**Always:**
- Commit `refactor(web)` à parte, antes da tela: `HashCopy` vai de `features/receipts/copy-button.tsx` para `shared/ui/hash-copy.tsx|.css` e `shortHash` para `shared/lib/hash.ts` (o teste vai junto). O comprovante continua idêntico.
- Commit `feat(audit)` à parte: `artist` em `GET /lots/:id/audit` (select, DTO, teste e `types.ts`), sem query nova.
- Tela `/lots/:id/audit`, pública, com o cabeçalho atual: "Auditoria pública · {lotLabel}" (D-054), título, selo de status (Ao vivo/Agendado/Encerrado), artista e "{n} lances registrados". Sem link para o comprovante: o token só chega ao vencedor e ao leiloeiro, e o vencedor decide com quem compartilhar.
- Veredito no quadro do canvas, com o selo `ag-seal` Íntegro (intact) ou Adulterado (os outros três), título, texto em linguagem simples, "Verificado agora, às HHhMM." e "Verificar de novo" (refaz o GET):
  - intact: "Histórico íntegro" · "Os {n} lances estão em sequência, sem nenhuma quebra, e o último confere com o selo do lote. Nada foi alterado, apagado ou incluído depois." (sem lances: "O lote ainda não recebeu lances. Quando receber, cada um entra na sequência e pode ser conferido aqui.")
  - tampered: "Histórico adulterado no lance {brokenSeq}" · "O lance {brokenSeq} foi alterado depois de registrado: os dados dele não conferem mais com o código. A partir dele, nenhum lance pode ser confirmado."
  - truncated: "Histórico adulterado: lances removidos do fim" · "Os {n} lances listados estão em sequência, mas o último não confere com o selo do lote. Isso indica que lances foram apagados do final do histórico." Linha "Selo do lote" no fim da lista com "Não confere".
  - receipt_tampered: "Comprovante não confere com o histórico" · "Os lances estão íntegros, mas o comprovante do lote não confere com o último lance. O comprovante pode ter sido alterado depois da liquidação."
- Lista completa ("Todos os lances") no livro do canvas: seq, apelido, valor com centavos, horário (dia, hora e segundos no fuso do navegador), código abreviado com `HashCopy` e verificação "Íntegro" (✓ verde), "Adulterado" (✕ vermelho, linha destacada, nota "O histórico foi mexido aqui: o código registrado não confere com os dados deste lance.") ou "Não verificável" (nota "Depende do lance {brokenSeq} e não pode ser confirmado." só na primeira). Códigos visíveis por padrão, com "Esconder códigos"/"Mostrar códigos". Abaixo de 980px, cada lance vira cartão com rótulos, como no canvas.
- "Como a verificação funciona": os três passos do canvas e "Saiba mais sobre a verificação" → `https://github.com/0Perera/agora-leiloes#auditoria` (nova aba).
- Estados: esqueleto (`.skel`), erro com `LoadError` ("Não foi possível fazer a auditoria" / "Não conseguimos fazer a verificação agora. Isso não indica nenhum problema no lote; tente de novo.") e 404 com `NotFound` ("Lote não encontrado", "Buscar outro lote" → `/#auditoria`; `NotFound` ganha o destino por prop). Id inválido também é 404.
- Bloco de auditoria da página inicial (`id="auditoria"`), depois de "Como funciona": selo "Lances selados", título, texto e campo "Número do lote" com prefixo "Nº", dica "Número do lote, ex.: 7 ou VII" e "Auditar lote". Aceita dígitos ou romano em qualquer caixa, com ou sem "lote " na frente (`fromRoman`), de 1 a 2147483647; chama `GET /lots/number/:number` e navega para `/lots/{id}/audit`. Erros junto do campo (`FieldError`): vazio "Informe o número do lote para auditar."; inválido "Use o número do lote, como 7 ou VII."; 404 "Lote {romano} não encontrado. Confira o número no card ou no comprovante."; falha de rede "Não foi possível buscar o lote agora. Tente de novo.".
- Links para `/lots/:id/audit` ("Auditar este lote", botão quieto): no histórico da sala; no comprovante, ao lado de "Copiar link", e como link nas frases que mandam conferir a auditoria pública (válido e inválido); no destaque da página inicial; no card da vitrine só ao vivo e encerrado (agendado não, como no canvas), acima da área clicável (`z-index`), sem abrir a sala; em Meus lances, aba Não arrematados, "Auditar lote" ao lado de "Abrir sala".
- Cabeçalho para todos: Vitrine, Como funciona (`/#como-funciona`), Auditoria (`/#auditoria`) e depois Meus lances (licitante) ou Painel do leiloeiro (leiloeiro). Os dois links de seção rolam até ela, também vindo de outra página e clicando de novo na mesma página; não ficam marcados como página atual.
- Valores com centavos (D-048), nada quebra a partir de 360px; blocos de `shared/ui` reaproveitados.
- As entradas da 5.8 em `deferred-work.md` ficam como estão; a PR lista quais foram atendidas.

**Never:**
- Mudar a API além do `artist` da auditoria, adicionar dependência ou recriar o esqueleto, o erro, o "não encontrado", o selo ou a cópia com o prefixo da tela.

## I/O & Edge-Case Matrix

| Cenário | Estado | Resultado |
|---|---|---|
| Íntegro | `intact`, n lances | selo Íntegro, "Histórico íntegro", todos "Íntegro" |
| Sem lances | `intact`, 0 lances | selo Íntegro, texto de lote sem lances, lista vazia |
| Alterado | `tampered`, `brokenSeq` 7 | título cita o lance 7; 7 "Adulterado", 8+ "Não verificável", nota no 8 |
| Removidos do fim | `truncated` | título de lances removidos, linha "Selo do lote · Não confere" |
| Comprovante | `receipt_tampered` | selo Adulterado, "Comprovante não confere com o histórico" |
| Campo "vii" | lote 7 existe | navega para a auditoria do lote 7 |
| Campo "99" | 404 | "Lote XCIX não encontrado. Confira…" junto do campo |
| Campo "abc" | não é número | "Use o número do lote, como 7 ou VII." sem chamar a API |

</frozen-after-approval>

## Code Map

- `web/src/features/receipts/copy-button.tsx` (`HashCopy`), `receipt.ts` (`shortHash`, `signText`), `receipt.spec.ts`, `receipt-page.tsx:150-160` (frase "use a auditoria pública"), `receipt.css` (`.receipt-hash*`).
- `web/src/shared/ui/link-copy.tsx` -- `useCopy`, `ManualCopy` para o `HashCopy`; `not-found.tsx` (destino fixo `/`), `load-error.tsx`, `skeleton.css`, `field-error.tsx`; `bundle.css` (`ag-seal--intact|--tampered`, `ag-input__prefix`, `ag-badge--*`).
- `web/src/shared/api/types.ts:184-215` -- `LotAudit`, `AuditBid`, `AuditResult`, `BidMark`, `LotId` prontos; `client.ts` sem `audit`/`lotByNumber`.
- `web/src/shared/lib/roman.ts` (`fromRoman`, `toRoman`, `lotLabel`); `features/lots/showcase-search.ts` (`maxNumber`, romano minúsculo só com "lote ").
- `web/src/features/lots/home-page.tsx`, `how-it-works.tsx` (seção sem `id`), `featured.tsx`, `lot-card.tsx` (`.lot-link::after` cobre o card), `lots.css`.
- `web/src/features/live-room/room-history.tsx:42-45` -- nota da auditoria; `features/live-room/room-page.tsx` -- padrão de id inválido → 404.
- `web/src/features/my-bids/lost.tsx` -- ação "Abrir sala".
- `web/src/app/header.tsx` (nav), `layout.css:47-72,249-291` (nav com rolagem lateral no celular), `router.tsx`.

## Tasks & Acceptance

**Execution:**
- [x] `web/src/shared/ui/hash-copy.tsx|.css`, `shared/lib/hash.ts|.spec.ts`, `features/receipts/*` -- extrair (commit `refactor(web)`).
- [x] `api/src/audit/audit.service.ts`, `dto/audit-response.dto.ts`, `api/test/*audit*`, `web/src/shared/api/types.ts` -- `artist` (commit `feat(audit)`).
- [x] `web/src/shared/api/client.ts` -- `api.audit(id)`, `api.lotByNumber(number)`.
- [x] `web/src/features/audit/audit.ts|.spec.ts` -- funções puras: veredito (título, texto, selo) por resultado, rótulo e nota de cada lance, leitura do número do campo (matriz).
- [x] `web/src/features/audit/use-audit.ts`, `audit-page.tsx`, `audit.css`; rota em `router.tsx`.
- [x] `web/src/features/lots/audit-lookup.tsx` + `home-page.tsx`, `how-it-works.tsx`, `lots.css` -- bloco, `id`s e rolagem pelo hash.
- [x] `web/src/app/header.tsx`, `shared/ui/not-found.tsx` -- links e destino do botão.
- [x] Links: `room-history.tsx`, `receipt-page.tsx`, `featured.tsx`, `lot-card.tsx`, `lots.css`, `my-bids/lost.tsx`.
- [x] `README.md`, `docs/ai-log.md` -- funcionalidade e entrada da story.

**Acceptance Criteria:**
- Given `/lots/:id/audit` sem login, when carrega, then mostra o veredito e a lista; em 1280px fontes, espaços e larguras iguais ao canvas.
- Given o card da vitrine, when clica em "Auditar este lote", then abre a auditoria e não a sala.
- Given outra página, when clica em "Como funciona" ou "Auditoria" no cabeçalho, then abre a página inicial já rolada até a seção.
- Given 360, 768, 1024 e 1280px, when a auditoria, o bloco da página inicial e os links novos são exibidos, then nada estica, vaza, sobrepõe nem quebra em lugar estranho.

## Implementation Notes

- Colunas do livro em 1280px: código com 290px (caixa de copiar) e verificação com 190px, para "Não verificável" caber numa linha.
- Abaixo de 420px só a linha do código vai para baixo do rótulo; as outras ficam lado a lado, como no canvas.
- Menu do cabeçalho no celular: rola para o lado sem barra visível, com esmaecido na borda direita (licitante precisa de 453px, leiloeiro de 511px, há 316px em 360).
- `signText(false)` termina em "pode ter sido alterado."; a página acrescenta a frase com o link para a auditoria.

## Spec Change Log

## Review Triage Log

| Achado | Veredito | Evidência |
|---|---|---|
| `truncated` sem nenhum lance: texto "Os 0 lances…" e sem a linha do selo | high, corrigido | Todos os lances apagados é a remoção que a auditoria existe para acusar. Texto próprio e linha "Selo do lote" mesmo com a lista vazia, com teste. |
| Âncora malformada (`/#%E0`) derruba a página inicial | medium, corrigido | `decodeURIComponent` lançava dentro do efeito; agora cai no texto cru. Conferido no navegador. |
| Seção rolada antes de a vitrine carregar sai da tela | false | Medido vindo da auditoria em 1280 e 768px: a posição da seção é a mesma em 0,3 s, 1,5 s e 4 s. |
| Rolagem volta à âncora quando o destaque termina de carregar depois | low, não corrigido | Só num primeiro carregamento lento em que a pessoa já rolou. |
| Busca do campo navega depois que a pessoa saiu da página | low, não corrigido | Só com a API dormindo e a pessoa trocando de tela no meio da busca. |
| Falha no "Verificar de novo" troca o veredito pela tela de erro | low, não corrigido | A tela de erro traz "Tentar de novo"; nada se perde. |
| Texto antigo do veredito fica sob "Verificando o histórico…" | low, não corrigido | Dura o tempo da requisição. |
| `brokenSeq` nulo com resultado `tampered` | false | `verify` sempre devolve o `seq` do lance quebrado em `tampered` (`audit/chain.ts`). |

## Design Notes

A auditoria não liquida o lote (5.5): lote vencido aparece encerrado e pode estar sem comprovante, o que não muda o veredito. O selo do lote não vem na API, então a linha de `truncated` diz que não confere sem mostrar os códigos (o canvas mostra os dois).

## Verification

**Commands:**
- `cd web && npx vitest run --silent` -- verde
- `cd web && npm run lint:check && npm run build` -- sem erros

**Manual checks:**
- Canvas e app lado a lado em 1280px (auditoria e bloco da página inicial); screenshots em 360, 768, 1024 e 1280 dos quatro resultados, do 404, do bloco com erro e dos links novos.
