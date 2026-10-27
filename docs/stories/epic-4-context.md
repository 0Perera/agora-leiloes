# Epic 4 Context: Lances ao vivo

<!-- Compilado dos artefatos de planejamento. Edite à vontade. Gere de novo com compile-epic-context se os docs de planejamento mudarem. -->

## Goal

O licitante dá lances num lote ao vivo com todas as regras (status, liderança, incremento, saldo), saldo comprometido e anti-sniping, e acompanha a sala e o destaque da vitrine em tempo real por SSE. A cadeia de HMAC, o selo do lote e o alias por lote nascem aqui, porque todo lance entra encadeado desde o primeiro. O épico prova a consistência sob concorrência com lances simultâneos contra Postgres real (Testcontainers) e um job de e2e no CI, e entrega a base que a liquidação, o comprovante e a auditoria (épico 5) vão ler.

## Stories

- Story 4.1: Regras de lance, saldo comprometido e anti-sniping (TDD)
- Story 4.2: Cadeia de HMAC, selo e alias (TDD)
- Story 4.3: Dar lance na API
- Story 4.4: Testcontainers, CI e lances simultâneos
- Story 4.5: Tempo real, histórico e situação do licitante na API
- Story 4.6: Tela Sala do lote ao vivo (lances e tempo real)
- Story 4.7: Destaque ao vivo e lotes comprometidos na carteira

## Requirements & Constraints

- Lance aceito só com o lote ao vivo (`starts_at <= now < ends_at`, hora do servidor via `Clock`). Primeiro lance ≥ lance inicial; os seguintes ≥ lance atual + incremento. O líder não cobre o próprio lance. O valor precisa caber no disponível.
- Ordem das checagens: status do lote → líder → valor → saldo.
- Recusas com código de domínio, todas 422 com `{ code, ...detalhe }`: `LOT_NOT_STARTED` (traz o início), `LOT_ENDED`, `ALREADY_WINNING`, `BID_BELOW_MINIMUM` (traz o mínimo aceito), `INSUFFICIENT_BALANCE` (traz o disponível). Recusa não muda nada no banco.
- Lote cancelado ou inexistente: 404 sem código. Leiloeiro dando lance: 403 `ROLE_NOT_ALLOWED`. Valor não inteiro ou acima do teto do `integer`: 400 `VALIDATION_FAILED`.
- Saldo comprometido: o valor cheio do lance do líder fica comprometido; quando ele é superado, volta ao disponível na mesma transação do novo lance. Primeiro lance não libera saldo de ninguém.
- Anti-sniping: lance aceito faltando 2 min ou menos faz `ends_at += 2 min` (soma ao fim atual, acumula sobre fim já prorrogado), na mesma transação. Lance recusado não prorroga.
- SSE `GET /lots/:id/stream` público, sem guard: um evento por lance aceito com `seq`, valor, alias e `endsAt`, emitido só depois do commit; heartbeat (comentário) a cada ~25s. Nunca `user_id`, nome ou e-mail. Transação revertida não emite nada.
- `GET /lots/:id` autenticado traz `me.alias`; visitante não recebe `me`.
- Histórico `GET /lots/:id/bids?page=` paginado, do mais recente ao mais antigo, com `seq`, alias, valor e horário, em uma query.
- `GET /wallet` passa a trazer os lotes que comprometem saldo (número, título, valor comprometido), lidos do último lance de cada lote, sem N+1.
- Cada rota tocada dispara um número fixo de queries (conferido no log).
- Concorrência: N lances simultâneos deixam `seq` contínuos e sem repetição, cadeia válida, `current_bid`/`bid_count` batendo com o último lance, só o líder final com valor comprometido e `balance >= committed >= 0` em todas as carteiras. Dois lances simultâneos do mesmo mínimo: um aceito, o outro `BID_BELOW_MINIMUM`.

## Technical Decisions

- Regra pura em `bids/bid.rules.ts`, sem TypeORM nem mock de repository, em TDD. Entrada: lote (`startsAt`, `endsAt`, `startingBid`, `increment`), último lance da cadeia (`userId`, `amount`) ou nenhum, licitante, disponível, valor e `now`. Saída: aceite (novo `endsAt` e movimentos de saldo) ou recusa (código e detalhe). Dividida por grupo de checagem para respeitar `complexity: 10`. Factories `makeLot()`, `makeBid()`.
- Cadeia em `audit/chain.ts` (função pura, TDD), usada pelo `bids` para gravar e pela auditoria do épico 5 para verificar. HMAC de cada lance cobre `lot_id`, `seq`, `user_id`, valor, data e hash anterior. Serialização canônica: campos em ordem fixa com separador, data ISO 8601 UTC com milissegundos, valor inteiro; o primeiro lance encadeia numa constante `genesis`.
- Selo no lote: HMAC da contagem de lances + último hash (lote sem lances usa zero e `genesis`). Detecta remoção do final da cadeia.
- Segredo único `BID_HMAC_SECRET`, obrigatório e com tamanho mínimo (a API não sobe sem ele), no `.env.example` e no `render.yaml` (gerado pelo Render). Prefixo de domínio em todo conteúdo assinado (`bid:`, `seal:`, `alias:`), para nenhuma assinatura valer em outro contexto.
- Alias calculado, não guardado: "Licitante " + 6 primeiros caracteres em base32 do HMAC `alias:` de `user_id` + `lot_id`. Diferente por lote para o mesmo licitante.
- `bids` (`lot_id`, `seq`, `user_id`, `amount`, `created_at`, `prev_hash`, `hash`) com `UNIQUE (lot_id, seq)` e índice em `lot_id`; migration também acrescenta o selo em `lots`. Tabela append-only: nenhum `UPDATE` ou `DELETE`.
- Fluxo do lance numa única transação, usando só o `manager`: trava o lote (`FOR UPDATE`), lê o último lance da cadeia, trava as carteiras do licitante e do líder anterior em ordem de `id`, aplica a regra, grava o lance com o `seq` seguinte e o hash encadeado, atualiza selo, `current_bid`, `bid_count` e `ends_at` e move o comprometido. A resposta traz o lance aceito e o `endsAt` atual.
- `current_bid` e `bid_count` são cópia só de exibição e ordenação. Liderança, dinheiro e vencedor sempre saem do último lance de `bids`.
- Stream em `lots/lot-events.service.ts`, em memória, numa instância só (limitação no README).
- Testes de integração em `api/test/*.e2e-spec.ts`, config `test/jest-e2e.json`, `npm run test:e2e`, Postgres real via `@testcontainers/postgresql` (devDependency aprovada) aplicando as migrations. Job `api-e2e` no CI obrigatório para merge.
- Mudança de contrato atualiza `web/src/shared/api/types.ts` na mesma PR.

## UX & Interaction Patterns

- **Sala** (`/lots/:id`):
  - licitante vê o formulário com o mínimo aceito como ajuda e atalhos mínimo, +1 e +2 incrementos; visitante vê "Entrar para dar lance"; leiloeiro não vê o formulário;
  - recusas traduzidas pelo código, com valor ou data do detalhe formatados: "Lance abaixo do mínimo. O mínimo agora é R$ X.", "Saldo insuficiente. Seu disponível é R$ X.", "Você já está ganhando. Aguarde ser superado para cobrir.", "Este lote ainda não começou. Abre em {data}.", "Este lote não aceita mais lances.";
  - situação do licitante (ainda não deu lance, ganhando, superado com o mínimo para cobrir) derivada de `me.alias` contra o alias do último lance; quando muda, o front refaz `GET /wallet` e o resumo do cabeçalho atualiza;
  - histórico com alias (ou "Você"), valor, horário e marca do líder; vazio: "Ainda não há lances. O primeiro precisa ser de pelo menos R$ X"; link para a auditoria do lote;
  - pelo SSE, histórico, lance atual, situação e contagem regressiva atualizam sem recarregar; prorrogado, a nota indica que o fim foi estendido. Ao conectar e reconectar, refaz `GET /lots/:id`.
- **Página inicial:** o destaque é o único stream aberto pela página (lance atual, nº de lances e prazo ao vivo, sem trocar de lote); os cards não atualizam ao vivo. Licitante que já deu lance no destaque vê "ganhando" ou "superado".
- **Carteira:** lista dos lotes que comprometem saldo, com link para a sala; sem nenhum, o estado vazio da 2.4.
- Visual nos canvas **Sala do lote ao vivo**, **Página inicial** e **Carteira**; função em `docs/screens.md`. Nenhuma tela quebra a partir de 360px.

## Cross-Story Dependencies

- A 4.3 liga a regra da 4.1 e a cadeia/alias da 4.2. A 4.4 testa o motor da 4.3 (não é TDD) e cobre também o caminho feliz, uma recusa por código e os fallbacks do destaque da 3.3.
- A 4.5 depende da 4.3 (evento depois do commit) e do alias da 4.2. A 4.6 depende da 4.5 e completa a sala de leitura da 3.7. A 4.7 depende da 4.5 e reaproveita o destaque da 3.6 e a carteira da 2.4.
- Usa `lots`, o `Clock`, `current_bid`/`bid_count` e o detalhe do épico 3, e carteiras, guards, exception filter e client de API do épico 2.
- O épico 5 lê a cadeia e o selo na auditoria, usa o último lance de `bids` na liquidação e no comprovante, e reaproveita o prefixo de domínio (`receipt:`). O timer de liquidação será recalculado a cada lance ou prorrogação.
