# Epic 5 Context: Encerramento e confiança

<!-- Compilado dos artefatos de planejamento. Edite à vontade. Gere de novo com compile-epic-context se os docs de planejamento mudarem. -->

## Goal

Fechar o ciclo do leilão: o lote vencido é liquidado uma vez só (débito do vencedor, crédito do leiloeiro, comprovante assinado), mesmo com a API dormindo no Render, e o resultado fica verificável por qualquer pessoa. O vencedor vê "você arrematou" na sala e compartilha um comprovante público cuja assinatura é conferida a cada exibição; o licitante acompanha os próprios lances e arremates; o leiloeiro vê o total recebido; e a auditoria pública lê a cadeia de HMAC e o selo nascidos no épico 4 para declarar o lote íntegro ou adulterado. É aqui que a promessa de confiança do produto vira algo que o avaliador consegue testar.

## Stories

- Story 5.1: Regras de liquidação (TDD)
- Story 5.2: Liquidação e comprovante assinado na API
- Story 5.3: Timer de liquidação em memória
- Story 5.4: Comprovante, meus lances e resultado do painel na API
- Story 5.5: Auditoria da cadeia na API (TDD)
- Story 5.6: Sala encerrada e tela Comprovante de arremate
- Story 5.7: Tela Meus lances e resultado no painel
- Story 5.8: Tela Auditoria do lote e campo da página inicial

## Requirements & Constraints

- Lote encerrado quando `now >= ends_at` (mesmo limite do lance); liquidar no instante exato do fim é permitido. Vale o fim prorrogado. Lote cancelado ou já liquidado não liquida.
- Liquidação: debita o valor do saldo do vencedor, libera o comprometido dele pelo mesmo valor (só o deste lote) e credita o saldo do leiloeiro. Lote sem lances: só `settled_at`, sem comprovante e sem movimento de saldo.
- Vencedor e valor saem sempre do último lance da cadeia em `bids`, nunca de `current_bid` (D-042).
- Idempotente: timer e acesso podem disparar juntos; só um grava, o outro vê `settled_at` ou bate no `UNIQUE (lot_id)` de `receipts` e termina sem erro para quem chamou (D-009).
- Dois gatilhos: acesso a lote vencido (`GET /lots/:id`, 5.2) e timer em memória (5.3). Nenhuma regra depende só do timer.
- Depois do commit, o stream do lote emite um evento de encerramento só com alias do vencedor e valor. Nunca `user_id`, nome ou e-mail.
- `GET /lots/:id` de lote liquidado traz o resultado (alias e valor); o token do comprovante só para o vencedor. O leiloeiro recebe o link pelo painel.
- `GET /receipts/:token` público: número, título, artista, valor, alias, data da liquidação, hash final e `valid` verificado na requisição; token inexistente 404.
- `GET /my-bids?section=ongoing|won|lost&page=` paginado, sem N+1. `GET /dashboard/summary` com total recebido (soma dos comprovantes dos lotes do leiloeiro, não o saldo, D-039) e `GET /dashboard/lots` com resultado e token por lote encerrado.
- Auditoria `GET /lots/:id/audit` pública: resultado `intact`, `tampered` (com o `seq` do primeiro lance quebrado) ou `truncated`; `tampered` tem prioridade, `truncated` só com cadeia intacta e selo divergente. Lista completa dos lances numa query só. `GET /lots/number/:number` devolve o id; inexistente ou cancelado responde 404.
- Selo nulo conta como não íntegro (D-058).
- Cada rota tocada dispara um número fixo de queries (conferido no log).

## Technical Decisions

- Regra pura `settlement/settlement.rules.ts` (função `decide`, `describe('decide')` como na 4.1), sem TypeORM, em TDD. Entrada: lote (`endsAt`, `cancelledAt`, `settledAt`, `currentBid`, `auctioneerId`), último lance ou nenhum, `now`. Saída: `{ settle: false, reason }` (`CANCELLED` → `ALREADY_SETTLED` → `NOT_ENDED`, nessa ordem) ou `{ settle: true, winner, moves }`, com `winner: null, moves: []` sem lances e movimentos como variações por carteira (vencedor `balance`/`committed` −valor; leiloeiro `balance` +valor).
- Fluxo da liquidação numa transação, só com o `manager`: trava o lote (`FOR UPDATE`), relê `settled_at`, lê o último lance, trava as carteiras do vencedor e do leiloeiro em ordem de `id`, aplica a regra, grava o comprovante e preenche `settled_at`. Todo usuário tem carteira, inclusive o leiloeiro (D-039).
- Tabela `receipts`: `UNIQUE (lot_id)`, token aleatório e não sequencial com `UNIQUE`, alias do vencedor, valor, hash final, data e assinatura. Migration junto da entidade.
- Assinatura em `receipts/receipt.signature.ts` (TDD, família da cadeia): prefixo `receipt:` sobre `lot_id`, alias do vencedor, valor, hash final e data da liquidação, no formato canônico (campos em ordem fixa separados por `|`, HMAC-SHA256 hex, data `toISOString()`, D-056). Mesmo segredo `BID_HMAC_SECRET` (D-029).
- Verificação da cadeia em `audit/chain.ts`, ao lado do `hashBid` da 4.2 (D-012). O lance já é recusado com 409 `LOT_INTEGRITY_FAILED` quando o selo não confere (D-059), então a auditoria encontra a evidência intacta.
- Timer (5.3): sem cron e sem `@nestjs/schedule`. No boot liquida os vencidos e arma para o próximo `ends_at` não liquidado; recalcula depois do commit de lance que prorroga ou de lote novo que encerra antes; liquida todos os lotes do mesmo instante; acima do limite do `setTimeout` (~24,8 dias, caso do lote do seed) dispara no limite e reagenda. Testado com `Clock` e timers falsos do Jest.
- e2e com Testcontainers (D-061: um container, suítes em série, `reset()` no início) e catálogo falso (D-060): liquidações simultâneas, caso D-042 (`current_bid` alterado no banco) e auditoria contra `UPDATE` no valor e `DELETE` do último lance.
- O seed (6.1) liquida um lote pelo service de liquidação com `Clock` deslocado (D-045): o service precisa funcionar fora de uma requisição HTTP.
- Contrato novo atualiza `web/src/shared/api/types.ts` na mesma PR; respostas como classes `*.dto.ts`.

## UX & Interaction Patterns

- **Sala encerrada:** ao zerar a contagem ou chegar o evento de encerramento, refaz `GET /lots/:id`, o selo vira Encerrado e o formulário some. Vencedor vê "você arrematou" com o valor debitado e o link do comprovante, e o resumo da carteira atualiza; os demais (licitante, visitante, leiloeiro) veem "lote encerrado" com alias e valor, ou sem lances.
- **Comprovante** (`/receipts/:token`, sem login): número, título, imagem, artista, valor, alias, data, selo "Comprovante válido"/"Comprovante inválido", hash final abreviado com copiar, link para a auditoria e botão de copiar o link. Token inexistente: "Comprovante não encontrado".
- **Meus lances** (`/my-bids`, só licitante): Em andamento (situação, lance atual, tempo restante), Arrematados (valor, data, link e copiar link), Não arrematados (valor final e o seu maior lance), paginadas. Vazio: "Você ainda não deu lances" com link para a vitrine. Leiloeiro ou visitante é redirecionado.
- **Painel:** resumo com o total recebido; no livro, lote encerrado mostra "arrematado por R$ X" ou "sem lances" e o link do comprovante quando arrematado.
- **Auditoria** (`/lots/:id/audit`, sem login): número, título, status, Íntegro ou Adulterado (primeiro lance quebrado ou "lances removidos do fim"), lista com seq, alias, valor, horário, hash abreviado e indicador por lance, explicação curta com link para o README. Campo da página inicial aceita "7" ou "VII" (helper da 3.6); inexistente mostra "lote não encontrado". Link "Auditar este lote" na sala, no card da vitrine e no comprovante.
- Toda tela com carregando, vazio e erro; nada quebra a partir de 360px. Visual nos canvas com os mesmos nomes de tela.

## Cross-Story Dependencies

- 5.2 usa a regra da 5.1 e a cadeia/alias da 4.2; 5.3 reaproveita o service da 5.2 e é recalculado pelo motor de lances da 4.3 e pela criação de lote da 3.x.
- 5.4 lê `receipts` da 5.2 e a verificação da assinatura; 5.5 lê a cadeia e o selo gravados desde a 4.3 (D-058, D-059).
- Telas dependem das APIs: 5.6 de 5.2 e 5.4; 5.7 de 5.4 (e do painel da 3.x); 5.8 de 5.5. A sala encerrada estende a sala e o SSE da 4.6.
- O épico 6 depende do service de liquidação para o lote encerrado do seed (D-045) e da auditoria `intact` nos lotes do seed.
