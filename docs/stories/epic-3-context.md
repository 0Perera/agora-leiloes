# Epic 3 Context: Acervo e lotes

<!-- Compilado dos artefatos de planejamento. Edite à vontade. Gere de novo com compile-epic-context se os docs de planejamento mudarem. -->

## Goal

O leiloeiro busca peças no acervo da Cleveland, cria lotes com snapshot dos dados e da imagem, cancela lotes sem lances e acompanha o resumo e o livro dos próprios lotes. O visitante navega pela vitrine com abas, busca e destaque, e abre a sala do lote para ver a obra, as condições e o prazo. O épico funciona sem lances: entrega a tabela `lots`, o `Clock` injetável e as leituras que o motor de lances (épico 4) e a liquidação (épico 5) vão usar.

## Stories

- Story 3.1: Busca no acervo da Cleveland
- Story 3.2: Criação de lote com snapshot e imagem
- Story 3.3: Vitrine, destaque e detalhe do lote na API
- Story 3.4: Painel do leiloeiro na API
- Story 3.5: Tela Painel do leiloeiro
- Story 3.6: Tela Página inicial (vitrine)
- Story 3.7: Tela Sala do lote ao vivo (leitura)

## Requirements & Constraints

- Busca no acervo só para leiloeiro (licitante 403, visitante 401). Lista paginada com id, título, artista, data, tipo, técnica e URL da imagem do CDN, só peças com imagem.
- Cleveland fora do ar, lenta além do timeout ou com erro: 503 `CATALOG_UNAVAILABLE`, sem afetar outras requisições.
- Criação de lote: o body traz só id da peça, lance inicial, incremento, início e fim. Sem título, descrição ou texto livre. Os dados da peça sempre vêm do `catalog`, nunca do cliente.
- Validação da criação (400 `VALIDATION_FAILED`): valores positivos e dentro do teto do `integer`, fim depois do início, início não no passado (tolerância de 1 min, relógio do servidor).
- Imagem: download na criação, `content-type` de imagem, até 5 MB. Se falhar, 502 `IMAGE_DOWNLOAD_FAILED` e nada é criado.
- Número do lote sequencial, global, único e imutável. A API trabalha com o inteiro; o romano é só no front.
- Status calculado na query com `now` do `Clock`: agendado (`now < starts_at`), ao vivo (`starts_at <= now < ends_at`), encerrado (`now >= ends_at`). Cancelado nunca aparece na vitrine, e `GET /lots/:id` de lote cancelado ou inexistente devolve 404.
- Vitrine (`GET /lots`): filtro por `status`, `q` (título ou artista, `ILIKE`) e `number` (inteiro), paginada, só com as colunas do card, mais a contagem de cada aba com a busca aplicada. Ordem: ao vivo por fim mais próximo, agendados por início mais próximo, encerrados por fim mais recente.
- Destaque (`GET /lots/featured`): ao vivo com maior `current_bid`; sem lance, o ao vivo que encerra primeiro; sem ao vivo, o próximo agendado; sem lote, 204.
- Detalhe (`GET /lots/:id`): snapshot, condições, status, lance atual, nº de lances, `endsAt` e `serverTime`.
- Painel: só os próprios lotes; lote de outro leiloeiro responde 404, sem revelar que existe. Resumo com ao vivo (e soma dos lances atuais), agendados (e próximo início) e encerrados (e quantos sem lance). O total recebido fica para o épico 5.
- Cancelamento: só lote próprio sem lances, agendado ou ao vivo. Com lance (checado depois do lock): 409 `LOT_HAS_BIDS`. Encerrado: 422 `LOT_ENDED`.
- Cada endpoint dispara um número fixo de queries (conferido no log). Nenhum endpoint de lote depende da Cleveland.

## Technical Decisions

- `catalog` é o único ponto de acesso à Cleveland: `fetch` nativo, timeout de 5s, `limit` e `fields` explícitos, cache em memória com TTL (sem `@nestjs/cache-manager`). Expõe a busca e um método de busca por id, com a mesma política. Nova env `CLEVELAND_API_URL`.
- Mapeamento da peça: artista de `creators[0].description`, com fallback para `culture`; sem os dois, vazio. Outros campos do snapshot: `title`, `creation_date`, `technique`, `measurements`, `type`, `id`/`accession_number`, descrição de `did_you_know` ou `description` (opcional), imagem de `images.web.url`. Mapeamento e cache têm teste unitário com client falso.
- `lots`: snapshot da obra, `number` gerado por sequência com `UNIQUE`, `starting_bid`, `increment`, `starts_at`, `ends_at`, `cancelled_at`, `settled_at`, `current_bid` (nulo) e `bid_count` (zero), com índices em `starts_at` e `ends_at`. O destaque ordena por `current_bid`, então precisa de índice que sustente essa ordem.
- `current_bid` e `bid_count` são só cópia de exibição e ordenação. Dinheiro e vencedor sempre saem da tabela de lances.
- `lot_images` (`lot_id`, `content_type`, `bytes` em `bytea`), separada de `lots` para listagens nunca carregarem bytes. `GET /lots/:id/image` serve os bytes com o `content-type` salvo e `Cache-Control` longo.
- Lote e imagem criados numa única transação. Cancelamento em transação com `FOR UPDATE` no lote.
- A 3.2 cria o `Clock` injetável em `common/`.
- Busca de texto com `ILIKE`, sem índice de texto.
- Novos códigos de erro: `CATALOG_UNAVAILABLE` (503), `IMAGE_DOWNLOAD_FAILED` (502), `LOT_HAS_BIDS` (409). `LOT_ENDED` usa 422, o mesmo status das recusas de lance.
- Rotas novas do front: `/` (`features/lots`), `/lots/:id` (`features/live-room`), `/dashboard` (`features/auctioneer`, só leiloeiro).
- Helpers em `shared/lib` com teste unitário: moeda (centavos para `R$ 12.400`), data, número romano (ida e volta) e tempo restante corrigido pelo `serverTime`.

## UX & Interaction Patterns

- **Painel do leiloeiro** (`/dashboard`):
  - resumo e livro de lotes paginado, com filtros Todos, Ao vivo, Agendados, Encerrados e Cancelados;
  - busca no acervo com imagem do CDN (única tela que usa o CDN), título, artista e tipo, e os estados carregando, vazio e "API do museu fora do ar";
  - ficha com os dados do acervo só para leitura e o número que o lote vai receber. Os únicos campos editáveis são lance inicial, incremento, início e fim, validados por campo antes do envio;
  - `IMAGE_DOWNLOAD_FAILED` aparece como "lote não criado por causa da imagem";
  - Cancelar pede a confirmação "Tirar o lote da vitrine?". Se vier `LOT_HAS_BIDS`, a tela avisa que chegou um lance.
- **Página inicial** (`/`):
  - o destaque vem de `/lots/featured` e some quando não há destaque. Ele não troca de lote enquanto o usuário está na página;
  - bloco "Como funciona" com quatro passos estáticos;
  - abas com contagem. O card mostra número em romano, título, artista, imagem servida pela API, preço (atual, inicial ou final) e tempo (encerra em, abre em ou encerrado em);
  - a busca vale para a aba atual: "7" ou "VII" vira `number`, o resto vai como `q`. Sem resultado, mostra "Limpar busca".
- **Sala** (`/lots/:id`, só leitura neste épico):
  - cabeçalho com número em romano, título, artista, data, técnica e selo de status;
  - lance atual ou inicial, contagem regressiva corrigida pelo `serverTime` e a seção "Sobre a obra e o lote";
  - lote inexistente ou cancelado mostra "lote não encontrado" com volta à vitrine;
  - os cards e o destaque levam à sala.
- Nenhuma imagem de lote usa o CDN da Cleveland. Todas as telas têm os estados carregando, vazio e erro com "Tentar de novo", e nenhuma quebra a partir de 360px.
- O visual segue os canvas **Painel do leiloeiro**, **Página inicial** e **Sala do lote ao vivo**. A função vem de `docs/screens.md`.

## Cross-Story Dependencies

- A 3.2 depende da busca por id da 3.1. A 3.3 e a 3.4 dependem de `lots` e do `Clock` da 3.2.
- A 3.5 depende da 3.1, da 3.2 e da 3.4. A 3.6 e a 3.7 dependem da 3.3, e a 3.7 reaproveita os helpers da 3.6.
- Todas usam os guards, o exception filter, o client de API, o layout e a sessão do épico 2. O menu ganha Painel e Criar lote para o leiloeiro.
- Com outros épicos:
  - o épico 4 atualiza `current_bid` e `bid_count`, traz `me.alias` no detalhe e acrescenta o formulário de lance, o histórico e o tempo real da sala e do destaque;
  - o teste de integração dos fallbacks do destaque fica na 4.4, com o Testcontainers;
  - o épico 5 traz o total recebido, o resultado e o link do comprovante no painel, e o campo de auditoria na vitrine.
