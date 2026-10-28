---
status: final
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - "Teste tecnico Elite Dev - Verzel.pdf (enunciado, fora do repositório)"
  - CLAUDE.md
  - docs/decisions.md
  - docs/screens.md
  - docs/stories/1.1-esqueleto.md
---

# Ágora - Épicos e stories

## Visão geral

Quebra do trabalho restante (épicos 2 a 6) em stories de até 2 a 3 horas, uma PR cada.
O épico 1 (esqueleto, CI, deploy e compose) foi concluído na story 1.1.

**Produto (resumo do PRD):** casa de leilões online de arte clássica europeia, com itens do Cleveland Museum of Art.
O leiloeiro cria lotes a partir do acervo, os licitantes depositam saldo simulado e dão lances ao vivo, o vencedor recebe um
comprovante compartilhável e qualquer pessoa audita o histórico. Enunciado: PDF da Verzel. Escopo e opcionais: D-018.

**Arquitetura (resumo):** fonte da verdade em `CLAUDE.md` (módulos, regras de banco, SSE, Cleveland, segurança, testes)
e em `docs/decisions.md` (D-001 a D-038, que não são rediscutidas). Telas: `docs/screens.md` e o canvas do Claude Design.

## Inventário de requisitos

### Requisitos funcionais

- FR1: Cadastro com nome, e-mail, senha e papel (`AUCTIONEER` ou `BIDDER`), que não muda depois (D-016).
- FR2: Login por e-mail e senha, com JWT no header e validade de 8h, sem refresh (D-006).
- FR3: Autorização por papel: leiloeiro não dá lance, licitante não cria lote (`ROLE_NOT_ALLOWED`); leiloeiro só vê e cancela os próprios lotes.
- FR4: Carteira do licitante com saldo total, comprometido e disponível (total − comprometido), mais a lista dos lotes que comprometem saldo.
- FR5: Depósito simulado com valor mínimo e máximo validados (teto do `integer`, D-015).
- FR6: Busca no acervo da Cleveland pelo módulo `catalog`, com timeout de 5s, `limit` e `fields` explícitos, cache e erro tratado quando a API cai.
- FR7: Criação de lote a partir de um item do acervo: snapshot dos dados e da imagem (`lot_images`), lance inicial, incremento mínimo, início e fim.
  Dados da obra só do acervo: sem título editável e sem observações do leiloeiro (D-038). Se a imagem falhar, o lote não é criado (D-004).
- FR7a: Número do lote sequencial, global e único, gerado pelo banco e exibido em romano ("Lote VII") (D-036).
- FR8: Cancelamento de lote sem lances, com lock do lote; lote cancelado some da vitrine e responde 404 em lances.
- FR9: Painel do leiloeiro: resumo (total recebido, ao vivo, agendados, encerrados) e livro de lotes com filtros, resultado e link do comprovante.
- FR10: Vitrine paginada com abas ao vivo, agendados e encerrados (status calculado, D-010), com contagem por aba, sem cancelados e com busca por título, artista ou número.
- FR11: Destaque da vitrine = lote ao vivo com o maior lance atual; sem lance, o ao vivo que encerra primeiro; sem ao vivo, o próximo agendado;
  sem lote, o bloco some. Não troca de lote enquanto o usuário está na página (D-037).
- FR12: Imagem do lote servida por `GET /lots/:id/image` com `Cache-Control` longo.
- FR13: Detalhe do lote (`GET /lots/:id`) com o estado completo, `serverTime` e, se autenticado, `me.alias`.
- FR14: Regras de lance: aceito só com o lote ao vivo; o primeiro precisa ser ≥ ao lance inicial e os seguintes ≥ ao lance atual + incremento;
  o líder não cobre o próprio lance; o valor precisa caber no disponível. Recusas com código de domínio.
- FR15: Saldo comprometido: o valor do líder fica comprometido; quando ele é superado, volta ao disponível na mesma transação do novo lance.
- FR16: Anti-sniping: lance aceito faltando 2 min ou menos faz `ends_at += 2 min` (D-011), na mesma transação.
- FR17: Tempo real por SSE público (`GET /lots/:id/stream`), emitido depois do commit, só com dados públicos, com heartbeat (D-005).
  Usado na sala e no destaque da vitrine; os cards da vitrine não atualizam ao vivo (um stream por card estoura o limite de conexões do navegador).
- FR18: Liquidação: debita o vencedor, credita o leiloeiro e gera o comprovante; lote sem lances fecha sem vencedor.
  Disparo por timer em memória e por acesso a lote vencido, idempotente (D-009). `UNIQUE (lot_id)` nos comprovantes impede liquidar duas vezes.
- FR19: Comprovante público por token aleatório, assinado com HMAC e verificado a cada exibição (D-029).
- FR20: Meus lances: em andamento, arrematados (com comprovante e link de compartilhamento) e não arrematados.
- FR21: Cadeia de HMAC por lance e selo no lote (D-012).
- FR22: Auditoria pública: íntegro ou adulterado, primeiro lance quebrado ou remoção do final; lista completa dos lances com hash.
  Acesso pelo número do lote: o campo aceita "7" ou "VII"; número inexistente mostra lote não encontrado.
- FR23: Alias por lote derivado de HMAC (D-013); auditoria, comprovante e stream nunca expõem dado pessoal.
- FR24: O front traduz cada código de recusa numa mensagem clara (tabela em `docs/screens.md`).
- FR25: Seed com um leiloeiro, dois licitantes e ao menos um lote ao vivo com lances, criado pelos services (D-020), também no deploy.
- FR26: Num checkout limpo, `docker compose up` sobe banco, API e web, as migrations rodam e o comando do seed funciona.
  O seed é idempotente: rodar duas vezes não quebra nem duplica dados. Verificação junta da story do seed (base do compose entregue na 1.1).
- FR27 (opcional): documentação Swagger gerada a partir das classes `*.dto.ts` (D-023). Retirado no replanejamento do épico 6: vai para "Fora do escopo" no README.

### Requisitos não funcionais

- NFR1: Deploy público obrigatório (Render, D-027/D-034); o cold start é aceito e avisado (D-008).
- NFR2: Vitrine, sala, auditoria e comprovante funcionam com a API da Cleveland fora do ar.
- NFR3: Sem N+1; listagens paginadas e com colunas mínimas; índices nas colunas de filtro e ordenação.
- NFR4: Consistência sob concorrência: transação única, `FOR UPDATE` no lote e nas carteiras em ordem de `id`, `CHECK`s e `UNIQUE`s como última defesa (D-014).
- NFR5: Dinheiro em centavos `integer`; datas em UTC; hora do servidor via `Clock` injetável.
- NFR6: Privacidade: só alias em público; nunca logar senha, token ou dado pessoal.
- NFR7: Front responsivo a partir de 360px; toda tela com estados de carregando, vazio e erro.
- NFR8: Testes automatizados: Jest, TDD nas regras listadas (D-019), integração com Testcontainers, incluindo lances simultâneos.
- NFR9: Qualidade: lint com complexidade 10 e sem `any`, CI verde em toda PR.
- NFR10: README detalhado (≤ 300 linhas), com os comportamentos inesperados e a técnica de auditoria explicados.
- NFR11: Prazo de 7 dias corridos; uso de IA documentado em `docs/ai-log.md`.

### Requisitos adicionais (arquitetura)

- Esqueleto, CI, deploy pelo Blueprint e compose já existem (story 1.1). Nenhuma story de starter template.
- Migrations rodam no boot (D-031); schema só por migration gerada pelo CLI e revisada.
- Domínio em módulos Nest (`auth`, `users`, `wallets`, `catalog`, `lots`, `bids`, `settlement`, `audit`, `receipts`), com regra pura em `*.rules.ts`.
- Erros de domínio com código estável e exception filter em `common/`.
- Tabela `bids` append-only; `UNIQUE (lot_id, seq)`; `UNIQUE (lot_id)` em comprovantes; `CHECK balance >= committed >= 0`.
- Segredo único `BID_HMAC_SECRET` com prefixos de domínio (`bid:`, `seal:`, `alias:`, `receipt:`); envs novas no `.env.example`.
- Eventos SSE em memória, numa instância só (limitação no README).
- Front: client de API único e tipado, tipos em `web/src/shared/api/types.ts`, respostas do back como classes `*.dto.ts`.

### Requisitos de UX

Telas e comportamento em `docs/screens.md`; visual no canvas do Claude Design, com os mesmos nomes de tela. As 8 telas têm canvas pronto.

- UX-DR1: Cabeçalho por papel (visitante, licitante com o resumo da carteira, leiloeiro com o painel).
- UX-DR2: Formatação de moeda e datas só no front; contagem regressiva corrigida por `serverTime`; número do lote em romano.
- UX-DR3: O próprio usuário vê "Você" no lugar do próprio alias.
- UX-DR4: Página inicial (vitrine) · canvas feito.
- UX-DR5: Entrar e Criar conta · canvas feito.
- UX-DR6: Sala do lote ao vivo · canvas feito.
- UX-DR7: Carteira · canvas feito.
- UX-DR8: Meus lances · canvas feito.
- UX-DR9: Comprovante de arremate · canvas feito.
- UX-DR10: Auditoria do lote · canvas feito.
- UX-DR11: Painel do leiloeiro · canvas feito.

### Mapa de cobertura dos FRs

FR1, FR2, FR3: Épico 2 - cadastro, login e autorização por papel
FR4: Épico 2 (saldos) e Épico 4 (lotes que comprometem saldo)
FR5: Épico 2 - depósito simulado
FR6, FR7, FR7a, FR8: Épico 3 - acervo, criação com snapshot, número do lote, cancelamento
FR9: Épico 3 (resumo e livro) e Épico 5 (total recebido, resultado, comprovante)
FR10, FR11, FR12: Épico 3 - vitrine, destaque, imagem
FR13: Épico 3 (estado e `serverTime`) e Épico 4 (`me.alias`)
FR14, FR15, FR16, FR17, FR21, FR23, FR24: Épico 4 - motor de lances, SSE, cadeia de HMAC, alias, mensagens de recusa
FR18, FR19, FR20, FR22: Épico 5 - liquidação, comprovante, meus lances, auditoria
FR25, FR26: Épico 6 - seed e compose (FR27, Swagger, fora do escopo)

## Lista de épicos

### Épico 1: Fundação
Esqueleto do monorepo, CI, deploy no Render e compose. Concluído na story 1.1.

### Épico 2: Contas e carteira
Visitante cria conta com papel fixo e entra; licitante vê a carteira e faz depósito simulado. Traz a base de autorização por papel e o exception filter com códigos de domínio.
**FRs:** FR1, FR2, FR3, FR4 (saldos), FR5 · **UX:** DR1, DR5, DR7

### Épico 3: Acervo e lotes
Leiloeiro busca no acervo, cria lote com snapshot e imagem, cancela lote sem lances e acompanha o próprio livro. Visitante navega pela vitrine com abas, busca e destaque. Funciona sem lances.
**FRs:** FR6, FR7, FR7a, FR8, FR9 (resumo e livro), FR10, FR11, FR12, FR13 (estado e `serverTime`) · **UX:** DR2, DR4, DR11

### Épico 4: Lances ao vivo
Licitante dá lances com todas as regras, saldo comprometido e anti-sniping, e acompanha a sala em tempo real. Cadeia de HMAC e alias nascem aqui. Inclui o teste de lances simultâneos com Testcontainers e o job dele no CI.
**FRs:** FR4 (lotes comprometidos), FR13 (`me.alias`), FR14, FR15, FR16, FR17, FR21, FR23, FR24 · **UX:** DR3, DR6

### Épico 5: Encerramento e confiança
Lote vencido é liquidado e o vencedor recebe o comprovante assinado; a sala mostra "você arrematou" e "lote encerrado". Licitante vê os próprios lances e arremates; qualquer pessoa audita a cadeia; o painel mostra o total recebido.
**FRs:** FR9 (total recebido e resultado), FR18, FR19, FR20, FR22 · **UX:** DR6 (estados de encerramento), DR8, DR9, DR10

### Épico 6: Entrega
Seed idempotente também no deploy, compose verificado num checkout limpo, consistência da API e do front, documentação, cancelamento com estorno, polimento final e README final.
**FRs:** FR25, FR26 · **NFR:** NFR10

NFR3 a NFR9 são transversais: entram como critério de aceite nas stories que tocam cada ponto.
`lots` é tocada nos épicos 3, 4 e 5 de propósito: cada épico é uma fatia vertical com front, e a sobreposição é só nas colunas que cada um precisa.

---

## Épico 1: Fundação

API e front rodando local e em produção, com CI verde e compose completo, sem regra de negócio. Concluído.

### Story 1.1: Esqueleto do monorepo no ar

Como desenvolvedor,
quero o monorepo com API, front, CI e deploy funcionando,
para tirar o risco de deploy no primeiro dia.

**Status:** concluída (`9c920bb`). Detalhe e critérios em `docs/stories/1.1-esqueleto.md`.

---

## Épico 2: Contas e carteira

Visitante cria conta com papel fixo e entra; licitante vê a carteira e faz depósito simulado.
Traz a base que os épicos seguintes usam: guards de autenticação e papel, erros de domínio com código estável e exception filter.

### Story 2.1: Cadastro e login na API

Como visitante,
quero criar uma conta com um papel e entrar com e-mail e senha,
para usar a plataforma como leiloeiro ou licitante.

**Cobre:** FR1, FR2, FR3

**Notas:**
- Abre a branch com os commits de documentação, antes de qualquer código: `docs(infra): adiciona planejamento de épicos e inventário de telas`
  (`epics.md`, `screens.md`) e `docs(infra): registra decisões D-036 a D-041` (`decisions.md` e as linhas novas do `CLAUDE.md`).
  A descrição da PR diz numa linha que ela também traz o planejamento.
- Dependência aprovada: `@nestjs/jwt`, com guard à mão, sem `passport`. Hash de senha com `crypto.scrypt` nativo (D-040).
- Decisões que esta story implementa: D-040.
- Nova env: `JWT_SECRET` (no `.env.example` e no `render.yaml`).

**Acceptance Criteria:**

**Given** um visitante
**When** faz `POST /auth/signup` com nome, e-mail, senha e papel `AUCTIONEER` ou `BIDDER`
**Then** o usuário é criado com a senha guardada só como hash `scrypt` com salt aleatório, e a resposta traz o token e o usuário, sem a senha
**And** a migration cria `users` com `UNIQUE` no e-mail (normalizado em minúsculas)

**Given** um e-mail já cadastrado
**When** alguém tenta se cadastrar com ele
**Then** a API responde 409 com o código `EMAIL_TAKEN`

**Given** campos inválidos (e-mail malformado, senha curta, papel fora da lista)
**When** o cadastro é enviado
**Then** a API responde 400 com `{ code: 'VALIDATION_FAILED', fields: { <campo>: <regra> } }`, e nenhum usuário é criado

**Given** um usuário cadastrado
**When** faz `POST /auth/login` com as credenciais certas
**Then** recebe um JWT válido por 8h com `sub` e `role`
**And** com e-mail inexistente ou senha errada recebe o mesmo 401 `INVALID_CREDENTIALS`, e a comparação do hash usa `timingSafeEqual`

**Given** um token válido
**When** chama `GET /auth/me`
**Then** recebe id, nome, e-mail e papel; sem token ou com token expirado recebe 401

**Given** uma rota marcada com o papel exigido
**When** um usuário de outro papel a chama
**Then** a API responde 403 com o código `ROLE_NOT_ALLOWED`
**And** o exception filter em `common/` mapeia toda exceção de domínio para `{ code }` com o status certo, coberto por teste unitário

**And** senha e token nunca aparecem em log; o papel não tem rota de alteração

### Story 2.2: Carteira e depósito simulado na API

Como licitante,
quero ver meu saldo e fazer um depósito simulado,
para ter dinheiro disponível para dar lances.

**Cobre:** FR4 (saldos), FR5

**Notas:**
- Toda conta ganha uma carteira, inclusive o leiloeiro, que recebe o crédito da liquidação no épico 5 (D-039). Rotas de carteira só para licitante.
- Limites do depósito: mínimo R$ 1,00 e máximo R$ 100.000,00 por operação; o saldo resultante é conferido contra o teto do `integer` (D-015).

**Acceptance Criteria:**

**Given** a migration desta story
**When** ela roda
**Then** cria `wallets` com `balance` e `committed` em centavos `integer`, `UNIQUE (user_id)` e `CHECK (balance >= committed AND committed >= 0)`
**And** cria a carteira dos usuários que já existem

**Given** um cadastro novo, de qualquer papel
**When** o usuário é criado
**Then** a carteira com saldo zero é criada na mesma transação

**Given** um licitante autenticado
**When** chama `GET /wallet`
**Then** recebe `balance`, `committed` e `available` (`balance − committed`) em centavos

**Given** um licitante autenticado
**When** faz `POST /wallet/deposits` com um valor dentro dos limites
**Then** o saldo aumenta exatamente o valor, numa transação com `FOR UPDATE` na carteira, e a resposta traz o novo saldo

**Given** um valor abaixo do mínimo, acima do máximo, não inteiro ou que levaria o saldo acima do teto
**When** o depósito é enviado
**Then** a API responde 400 e o saldo não muda

**Given** um leiloeiro
**When** chama `GET /wallet` ou `POST /wallet/deposits`
**Then** recebe 403 `ROLE_NOT_ALLOWED`

**And** `GET /wallet` dispara uma query só (conferido no log de queries)

### Story 2.3: Telas Entrar e Criar conta

Como visitante,
quero criar conta e entrar pelo navegador,
para usar a plataforma no meu papel.

**Cobre:** FR1, FR2, FR3 · UX-DR1, UX-DR5

**Telas:** "Entrar e Criar conta" em `docs/screens.md`; canvas **Entrar e Criar conta**. Cabeçalho por papel (Regras comuns do `screens.md`).

**Notas:** dependência aprovada: `react-router` v7 no modo biblioteca (D-041). Erros de validação traduzidos por campo a partir de `fields`.

**Acceptance Criteria:**

**Given** o app
**When** esta story termina
**Then** há rotas, layout com cabeçalho e um provider de sessão em `web/src/app/`, e o client de API único envia o `Authorization: Bearer` quando há token
**And** os tipos das respostas de auth estão em `web/src/shared/api/types.ts`

**Given** um visitante em `/signup`
**When** preenche nome, e-mail, senha e papel e envia
**Then** a conta é criada, a sessão começa e ele é levado à vitrine (licitante) ou ao painel (leiloeiro)

**Given** um visitante em `/login`
**When** entra com credenciais válidas
**Then** a sessão começa e ele é redirecionado conforme o papel
**And** a sessão sobrevive a um recarregamento da página até o token expirar; com token expirado, volta a visitante

**Given** e-mail já cadastrado, credenciais inválidas ou campo inválido
**When** o formulário é enviado
**Then** a mensagem aparece junto do campo ou do formulário, traduzida do código da API

**Given** um visitante, um licitante e um leiloeiro
**When** cada um vê o cabeçalho
**Then** os itens de menu são os do papel, como em "Regras comuns"
**And** rotas de outro papel redirecionam (rotas que ainda não existem não aparecem no menu)

**And** as telas não quebram a partir de 360px de largura

### Story 2.4: Tela Carteira

Como licitante,
quero ver meus saldos e depositar pelo navegador,
para saber quanto posso dar de lance.

**Cobre:** FR4, FR5 · UX-DR1, UX-DR7

**Telas:** "Carteira" em `docs/screens.md`; canvas **Carteira**. Resumo da carteira no cabeçalho do licitante.

**Acceptance Criteria:**

**Given** um licitante em `/wallet`
**When** a página carrega
**Then** vê saldo total, comprometido e disponível formatados em reais, com o aviso de que o saldo é simulado
**And** a tela tem os estados de carregando e erro com "Tentar de novo"

**Given** a lista de lotes que comprometem saldo
**When** o licitante não lidera nenhum lote (sempre, até o épico 4 entregar a lista na API)
**Then** aparece o estado vazio de verdade da lista, não um placeholder

**Given** um licitante
**When** deposita um valor válido
**Then** vê a mensagem de sucesso com o novo saldo, e a tela e o resumo do cabeçalho atualizam sem recarregar

**Given** um valor fora dos limites
**When** o licitante tenta depositar
**Then** a validação aparece no campo antes do envio, e um erro da API aparece traduzido

**Given** um licitante logado em qualquer tela
**When** olha o cabeçalho
**Then** vê o disponível e o comprometido da carteira

**And** um leiloeiro ou visitante que abre `/wallet` é redirecionado; a tela não quebra a partir de 360px

---

## Épico 3: Acervo e lotes

Leiloeiro busca no acervo, cria lote com snapshot e imagem, cancela lote sem lances e acompanha o próprio livro de lotes.
Visitante navega pela vitrine com abas, busca e destaque, e abre a sala do lote para ver a obra e o prazo. Funciona sem lances.

### Story 3.1: Busca no acervo da Cleveland

Como leiloeiro,
quero buscar peças no acervo do museu,
para escolher o que vai a leilão.

**Cobre:** FR6

**Notas:**
- Todo acesso à Cleveland fica no módulo `catalog` (`fetch` nativo, sem dependência nova). Cache em memória com TTL, sem `@nestjs/cache-manager`.
- Novo código de erro: `CATALOG_UNAVAILABLE` (503).
- Nova env: `CLEVELAND_API_URL` (no `.env.example`).

**Acceptance Criteria:**

**Given** um leiloeiro autenticado
**When** chama `GET /catalog/search?q=<termo>&page=<n>`
**Then** recebe uma lista paginada de peças com id, título, artista, data, tipo, técnica e URL da imagem do CDN
**And** a chamada à Cleveland usa timeout de 5s, `limit`, `fields` explícitos e só peças com imagem

**Given** uma peça com `creators` vazio
**When** ela é mapeada
**Then** o artista vem de `culture`; sem os dois, o campo vem vazio (mapeamento coberto por teste unitário)

**Given** uma busca repetida dentro do TTL
**When** o leiloeiro busca de novo
**Then** a resposta sai do cache, sem nova chamada à Cleveland (teste unitário com o client da Cleveland falso)

**Given** a Cleveland fora do ar, lenta além do timeout ou respondendo erro
**When** o leiloeiro busca
**Then** a API responde 503 `CATALOG_UNAVAILABLE`, sem derrubar a requisição de mais ninguém

**Given** o `catalog`
**When** esta story termina
**Then** existe um método que busca uma peça por id, com a mesma política de timeout, para a criação do lote usar
**And** um licitante ou visitante recebe 403/401 na rota de busca

### Story 3.2: Criação de lote com snapshot e imagem

Como leiloeiro,
quero criar um lote a partir de uma peça do acervo,
para colocá-la em leilão com as minhas condições.

**Cobre:** FR7, FR7a, FR12

**Notas:**
- Decisões que esta story implementa: D-004, D-036, D-038. Cria o `Clock` injetável em `common/`.
- `lots` já nasce com `current_bid` (nulo) e `bid_count` (zero), cache de leitura atualizado pelo lance no épico 4 (D-042).
- Novo código de erro: `IMAGE_DOWNLOAD_FAILED` (502).
- Imagem de até 5 MB. Tolerância de 1 min para "início não no passado" (relógio do servidor).

**Acceptance Criteria:**

**Given** as migrations desta story
**When** rodam
**Then** criam `lots` com o snapshot da obra, `number` gerado por sequência com `UNIQUE`, `starting_bid`, `increment`, `starts_at`, `ends_at`, `cancelled_at`, `settled_at`,
  `current_bid`, `bid_count` e índices em `starts_at` e `ends_at`
**And** criam `lot_images` (`lot_id`, `content_type`, `bytes` em `bytea`), separada de `lots`

**Given** um leiloeiro autenticado
**When** faz `POST /lots` com o id da peça, lance inicial, incremento, início e fim
**Then** a API busca a peça pelo `catalog` (nunca confia em dados da peça enviados pelo cliente), baixa a imagem e cria lote e imagem numa transação
**And** a resposta traz o lote com o número sequencial

**Given** valores não positivos, acima do teto do `integer`, fim antes ou igual ao início, ou início no passado
**When** o lote é enviado
**Then** a API responde 400 `VALIDATION_FAILED` e nada é criado

**Given** a imagem da peça que falha no download, responde com `content-type` que não é imagem ou passa de 5 MB
**When** o leiloeiro cria o lote
**Then** a API responde 502 `IMAGE_DOWNLOAD_FAILED` e nenhum lote é criado

**Given** um lote criado
**When** qualquer pessoa chama `GET /lots/:id/image`
**Then** recebe os bytes com o `content-type` salvo e `Cache-Control` longo, sem chamar a Cleveland

**And** um licitante que tenta criar lote recebe 403 `ROLE_NOT_ALLOWED`; o body não aceita título, descrição nem texto livre

### Story 3.3: Vitrine, destaque e detalhe do lote na API

Como visitante,
quero listar os lotes por situação, buscar e ver o lote em destaque,
para encontrar o que me interessa.

**Cobre:** FR10, FR11, FR13 (estado e `serverTime`)

**Notas:** decisões que esta story implementa: D-010, D-037, D-042. Busca de texto com `ILIKE`, sem índice de texto.
O teste de integração dos fallbacks do destaque entra na 4.4, junto da infraestrutura de Testcontainers.
Status calculado na query: agendado (`now < starts_at`), ao vivo (`starts_at <= now < ends_at`), encerrado (`now >= ends_at`), com `now` vindo do `Clock`.

**Acceptance Criteria:**

**Given** lotes nos três status e um cancelado
**When** alguém chama `GET /lots?status=live|scheduled|ended&q=&number=&page=`
**Then** recebe só os lotes do status pedido, paginados, com as colunas do card (número, título, artista, preço, início, fim, status)
**And** lotes cancelados nunca aparecem

**Given** a vitrine
**When** a lista é pedida
**Then** a resposta traz a contagem de cada aba, calculada com a busca aplicada
**And** a ordem é: ao vivo por fim mais próximo, agendados por início mais próximo, encerrados por fim mais recente

**Given** o parâmetro `q`
**When** é enviado
**Then** filtra por título ou artista com `ILIKE`, sem diferenciar maiúsculas

**Given** o parâmetro `number` (inteiro)
**When** é enviado
**Then** filtra pelo número do lote; a API não converte romano

**Given** os lotes existentes
**When** alguém chama `GET /lots/featured`
**Then** recebe o ao vivo com maior `current_bid`; sem lance, o ao vivo que encerra primeiro; sem ao vivo, o próximo agendado; sem lote, 204 (D-037)

**Given** um lote existente e não cancelado
**When** alguém chama `GET /lots/:id`
**Then** recebe o estado completo (snapshot, condições, status, lance atual, nº de lances, `endsAt`) e o `serverTime`
**And** lote inexistente ou cancelado responde 404

**And** cada endpoint dispara um número fixo de queries, sem N+1 (conferido no log), e nenhum depende da Cleveland

### Story 3.4: Painel do leiloeiro na API

Como leiloeiro,
quero ver o resumo e o livro dos meus lotes e cancelar um lote sem lances,
para gerenciar o que publiquei.

**Cobre:** FR3, FR8, FR9 (resumo e livro)

**Notas:** novo código de erro: `LOT_HAS_BIDS` (409). O total recebido entra no épico 5, junto da liquidação.

**Acceptance Criteria:**

**Given** um leiloeiro com lotes em vários status
**When** chama `GET /dashboard/lots?status=all|live|scheduled|ended|cancelled&page=`
**Then** recebe só os próprios lotes, paginados, com número, obra, status, lance inicial, lance atual, nº de lances e período

**Given** o mesmo leiloeiro
**When** chama `GET /dashboard/summary`
**Then** recebe a quantidade de ao vivo (com a soma dos lances atuais), de agendados (com o próximo início) e de encerrados (com quantos ficaram sem lance)

**Given** um lote próprio, agendado ou ao vivo, sem lances
**When** o leiloeiro faz `POST /lots/:id/cancel`
**Then** `cancelled_at` é preenchido numa transação com `FOR UPDATE` no lote, e o lote some da vitrine

**Given** um lote com ao menos um lance (checado depois do lock)
**When** o leiloeiro tenta cancelar
**Then** a API responde 409 `LOT_HAS_BIDS` e o lote não muda

**Given** um lote encerrado
**When** o leiloeiro tenta cancelar
**Then** a API responde 422 `LOT_ENDED` (mesmo status do código no lance, D-043)

**Given** um lote de outro leiloeiro
**When** o leiloeiro tenta ver ou cancelar
**Then** a API responde 404, sem revelar que o lote existe

**And** as duas rotas do painel disparam um número fixo de queries (conferido no log)

### Story 3.5: Tela Painel do leiloeiro

Como leiloeiro,
quero buscar no acervo, criar e cancelar lotes e ver meus resultados pelo navegador,
para gerenciar meus leilões.

**Cobre:** FR6, FR7, FR8, FR9 · UX-DR11

**Telas:** "Painel do leiloeiro" em `docs/screens.md`; canvas **Painel do leiloeiro**.

**Acceptance Criteria:**

**Given** um leiloeiro em `/dashboard`
**When** a página carrega
**Then** vê o resumo e o livro de lotes com os filtros Todos, Ao vivo, Agendados, Encerrados e Cancelados, paginado

**Given** a busca no acervo
**When** o leiloeiro pesquisa
**Then** vê resultados com imagem (do CDN da Cleveland), título, artista e tipo, com os estados carregando, vazio e "API do museu fora do ar"

**Given** uma peça escolhida
**When** a ficha abre
**Then** os dados do acervo aparecem só para leitura, com o número que o lote vai receber, e os campos editáveis são só lance inicial, incremento, início e fim
**And** as validações (valores positivos e no teto, fim depois do início, início não no passado) aparecem por campo antes do envio

**Given** uma criação que falha no download da imagem
**When** a API responde `IMAGE_DOWNLOAD_FAILED`
**Then** a tela diz que o lote não foi criado por causa da imagem

**Given** um lote sem lances
**When** o leiloeiro clica em Cancelar e confirma "Tirar o lote da vitrine?"
**Then** o lote passa a Cancelado no livro; se a API responder `LOT_HAS_BIDS`, a tela avisa que chegou um lance

**And** um licitante ou visitante em `/dashboard` é redirecionado; a tela não quebra a partir de 360px

### Story 3.6: Tela Página inicial (vitrine)

Como visitante,
quero ver o lote em destaque e navegar pela vitrine,
para encontrar lotes ao vivo, agendados e encerrados.

**Cobre:** FR7a, FR10, FR11 · UX-DR2, UX-DR4

**Telas:** "Página inicial (vitrine)" em `docs/screens.md`; canvas **Página inicial**.
O tempo real do destaque e a situação "ganhando/superado" entram no épico 4; o campo de auditoria entra no épico 5.

**Acceptance Criteria:**

**Given** a página inicial
**When** carrega
**Then** mostra o destaque devolvido por `GET /lots/featured` (sem destaque, o bloco some), o "Como funciona" e a vitrine
**And** o destaque não troca de lote enquanto o usuário está na página

**Given** a vitrine
**When** o usuário troca de aba
**Then** vê os lotes da aba, com a contagem em cada aba, e os cards com número em romano, título, artista, imagem servida pela API, preço e tempo

**Given** um termo de busca
**When** o usuário busca na aba atual
**Then** se o termo é um número arábico ou romano ("7" ou "VII"), o front converte com o helper e manda `number`; senão, manda `q`
**And** sem resultado, aparece o estado vazio com "Limpar busca"

**Given** a vitrine
**When** a lista está carregando, vazia ou com erro
**Then** cada estado aparece, com "Tentar de novo" no erro

**Given** os helpers de `shared/lib`
**When** esta story termina
**Then** moeda (centavos → `R$ 12.400`), data e número romano têm teste unitário

**And** nenhuma imagem de lote usa a URL do CDN da Cleveland; a tela não quebra a partir de 360px

### Story 3.7: Tela Sala do lote ao vivo (leitura)

Como visitante,
quero abrir a sala de um lote,
para ver a obra, as condições e quanto tempo falta.

**Cobre:** FR13 · UX-DR2, UX-DR6

**Telas:** "Sala do lote ao vivo" em `docs/screens.md`; canvas **Sala do lote ao vivo**.
Esta story faz a parte de leitura; formulário de lance, histórico e tempo real entram no épico 4.

**Acceptance Criteria:**

**Given** um lote existente em `/lots/:id`
**When** a sala carrega
**Then** mostra o cabeçalho (número em romano, título, artista, data, técnica, selo de status), o lance atual ou o inicial e a seção "Sobre a obra e o lote"

**Given** a contagem regressiva
**When** o relógio do cliente está adiantado ou atrasado em relação ao servidor
**Then** o tempo restante é calculado com `endsAt` corrigido pelo `serverTime` (helper com teste unitário)

**Given** um lote inexistente ou cancelado
**When** a sala é aberta
**Then** aparece a mensagem de lote não encontrado com volta à vitrine

**And** a sala tem os estados carregando e erro com "Tentar de novo"; os cards da vitrine e o destaque levam à sala; a tela não quebra a partir de 360px

---

## Épico 4: Lances ao vivo

Licitante dá lances com todas as regras, saldo comprometido e anti-sniping, e acompanha a sala em tempo real.
A cadeia de HMAC e o alias nascem aqui, porque todo lance entra encadeado desde o primeiro.
Inclui o teste de lances simultâneos contra Postgres real e o job dele no CI.

### Story 4.1: Regras de lance, saldo comprometido e anti-sniping (TDD)

Como licitante,
quero que cada lance seja aceito ou recusado por regras claras,
para disputar os lotes de forma justa.

**Cobre:** FR14, FR15, FR16

**Notas:**
- Só regra pura, sem TypeORM, em `bids/bid.rules.ts` (+ `bid.rules.spec.ts`), escrita em TDD. Sem endpoint nesta story.
- Entrada: lote (`startsAt`, `endsAt`, `startingBid`, `increment`), último lance da cadeia (`userId`, `amount`) ou nenhum, licitante, disponível, valor e `now`.
  Saída: aceite (novo `endsAt` e movimentos de saldo) ou recusa (código e, quando couber, o mínimo aceito).
- Ordem das checagens: status do lote → líder → valor → saldo. Factories `makeLot()`, `makeBid()`.

**Casos de teste (proposta, aguardando aprovação):**

`describe('BidRules.decide')`, status do lote:
1. recusa lance antes do início
2. aceita lance no instante exato do início
3. recusa lance no instante exato do fim
4. recusa lance depois do fim

Valor:
5. aceita primeiro lance igual ao lance inicial
6. recusa primeiro lance abaixo do lance inicial
7. aceita lance seguinte igual ao atual mais o incremento
8. recusa lance seguinte abaixo do atual mais o incremento
9. informa o mínimo aceito na recusa por valor

Líder:
10. recusa lance de quem já lidera
11. aceita lance de quem foi superado
12. recusa por liderança antes de checar o valor

Saldo:
13. recusa lance acima do disponível
14. aceita lance igual ao disponível
15. recusa por status antes de checar o saldo

`describe('BidRules.decide')`, saldo comprometido (movimentos devolvidos no aceite):
16. compromete o valor do lance na carteira do novo líder
17. libera o valor do líder anterior
18. primeiro lance não libera saldo de ninguém
19. compromete o valor cheio do novo lance de quem foi superado e volta, não a diferença

`describe('BidRules.decide')`, anti-sniping:
20. prorroga 2 min quando faltam exatamente 2 min
21. prorroga somando ao fim atual, não ao horário do lance
22. não prorroga quando faltam mais de 2 min
23. acumula prorrogação sobre um fim já prorrogado
24. lance recusado não prorroga

**Acceptance Criteria:**

**Given** os casos de teste aprovados
**When** a story termina
**Then** cada caso é um `it` em `bid.rules.spec.ts`, escrito antes da implementação, e todos passam
**And** a regra não importa TypeORM nem usa mock de repository

**Given** uma recusa
**When** a regra decide
**Then** devolve um dos códigos `LOT_NOT_STARTED`, `LOT_ENDED`, `ALREADY_WINNING`, `BID_BELOW_MINIMUM`, `INSUFFICIENT_BALANCE`
**And** `BID_BELOW_MINIMUM` traz o mínimo aceito, `INSUFFICIENT_BALANCE` traz o disponível e `LOT_NOT_STARTED` traz o início, para a mensagem do front

**And** a função respeita `complexity: 10` (dividida em funções menores por grupo de checagem)

### Story 4.2: Cadeia de HMAC, selo e alias (TDD)

Como qualquer pessoa,
quero que cada lance fique encadeado por uma assinatura do servidor,
para que alteração, remoção ou inserção no histórico seja detectável.

**Cobre:** FR21, FR23

**Notas:**
- Decisões que esta story implementa: D-012, D-013, D-029 (só o prefixo de domínio). Nova env: `BID_HMAC_SECRET`, obrigatória e com tamanho mínimo.
- Função pura em `audit/chain.ts` (+ spec), usada pelo `bids` para gravar e, no épico 5, pela auditoria para verificar.
- Serialização canônica: campos em ordem fixa com separador, data em ISO 8601 UTC com milissegundos, valor inteiro.
  Hash anterior do primeiro lance é uma constante fixa (`genesis`).
- Alias: "Licitante " + 6 caracteres em base32 do HMAC (D-044).

**Casos de teste (proposta, aguardando aprovação):**

`describe('chain.hashBid')`:
1. gera o mesmo hash para o mesmo lance
2. muda o hash quando muda o campo (`it.each` sobre `lotId`, `seq`, `userId`, `amount`, `createdAt`, `prevHash`: um `it` por campo)
3. encadeia o primeiro lance com o hash genesis
4. muda o hash quando muda o segredo
5. não coincide com um selo de mesmo conteúdo (prefixo de domínio `bid:` vs `seal:`)

`describe('chain.sealLot')`:
6. muda o selo quando muda a contagem de lances
7. muda o selo quando muda o último hash
8. selo de lote sem lances usa contagem zero e o hash genesis

`describe('alias.forLot')` (fora da lista de TDD, teste depois):
9. gera o mesmo alias para o mesmo licitante no mesmo lote
10. gera aliases diferentes para o mesmo licitante em lotes diferentes
11. usa "Licitante " seguido de 6 caracteres em base32

**Acceptance Criteria:**

**Given** os casos de teste aprovados
**When** a story termina
**Then** os casos 1 a 8 são escritos antes da implementação e todos passam; 9 a 11 passam

**Given** a API subindo sem `BID_HMAC_SECRET` ou com segredo curto
**When** a validação das envs roda
**Then** a API não sobe
**And** a env está no `.env.example` e no `render.yaml` (gerada pelo Render)

**And** nenhuma assinatura vale em outro contexto: todo conteúdo assinado leva o prefixo de domínio (`bid:`, `seal:`, `alias:`)

### Story 4.3: Dar lance na API

Como licitante,
quero dar um lance num lote ao vivo,
para disputar a peça.

**Cobre:** FR14, FR15, FR16, FR21

**Notas:** decisões que esta story implementa: D-011, D-014, D-042, D-043. Liga as regras da 4.1 e a cadeia da 4.2 numa transação.

**Acceptance Criteria:**

**Given** a migration desta story
**When** roda
**Then** cria `bids` (`lot_id`, `seq`, `user_id`, `amount`, `created_at`, `prev_hash`, `hash`) com `UNIQUE (lot_id, seq)` e índice em `lot_id`,
  e acrescenta o selo em `lots`
**And** nenhum código da aplicação faz `UPDATE` ou `DELETE` em `bids`

**Given** um licitante com saldo e um lote ao vivo
**When** faz `POST /lots/:id/bids` com um valor válido
**Then** numa única transação: trava o lote (`FOR UPDATE`), lê o último lance da cadeia, trava as carteiras do licitante e do líder anterior em ordem de `id`,
  aplica a regra, grava o lance com `seq` seguinte e o hash encadeado, atualiza selo, `current_bid`, `bid_count` e `ends_at`, e move o comprometido
**And** a resposta traz o lance aceito e o `endsAt` atual

**Given** qualquer recusa da regra
**When** o lance é enviado
**Then** a API responde 422 com `{ code, ...detalhe }` (D-043), e nada muda no banco

**Given** um lote cancelado ou inexistente
**When** alguém dá lance
**Then** a API responde 404, sem código de domínio

**Given** um leiloeiro
**When** tenta dar lance
**Then** recebe 403 `ROLE_NOT_ALLOWED`

**And** valor acima do teto do `integer` ou não inteiro responde 400 `VALIDATION_FAILED`; a rota dispara um número fixo de queries (conferido no log)

### Story 4.4: Testcontainers, CI e lances simultâneos

Como avaliador,
quero ver o motor de lances testado contra um Postgres real sob concorrência,
para confiar que dois lances simultâneos nunca corrompem o lote ou os saldos.

**Cobre:** FR14, FR15 · NFR4, NFR8

**Notas:** dependência aprovada: `@testcontainers/postgresql` (devDependency). Não é TDD: o motor já existe (4.3).

**Acceptance Criteria:**

**Given** `npm run test:e2e`
**When** roda
**Then** sobe um Postgres real com Testcontainers, aplica as migrations e roda `api/test/*.e2e-spec.ts` com a config `test/jest-e2e.json`

**Given** um lote ao vivo e N licitantes com saldo
**When** N lances válidos para o mesmo lote são enviados ao mesmo tempo
**Then** os `seq` ficam contínuos e sem repetição, a cadeia de hashes é válida, `current_bid` e `bid_count` batem com o último lance de `bids`
**And** só o líder final tem valor comprometido nesse lote, e `balance >= committed >= 0` vale em todas as carteiras

**Given** dois lances simultâneos do mesmo valor mínimo
**When** chegam juntos
**Then** um é aceito e o outro recusado com `BID_BELOW_MINIMUM`

**Given** a suíte e2e
**When** esta story termina
**Then** também cobre o caminho feliz do lance, uma recusa por código e os fallbacks do destaque da 3.3

**Given** o CI
**When** uma PR é aberta
**Then** um job `api-e2e` roda `npm run test:e2e` (Docker do runner do GitHub) e a PR só entra com ele verde

### Story 4.5: Tempo real, histórico e situação do licitante na API

Como licitante ou visitante,
quero receber cada lance novo na hora e ver o histórico do lote,
para acompanhar a disputa sem recarregar a página.

**Cobre:** FR4 (lotes comprometidos), FR13 (`me.alias`), FR17, FR23

**Notas:** decisão que esta story implementa: D-005. Stream em `lots/lot-events.service.ts`, em memória, numa instância.

**Acceptance Criteria:**

**Given** um lote
**When** alguém abre `GET /lots/:id/stream` (público, sem guard)
**Then** recebe um evento por lance aceito com `seq`, valor, alias do licitante e `endsAt`, e um comentário de heartbeat a cada ~25s
**And** o payload nunca traz `user_id`, nome ou e-mail

**Given** um lance aceito
**When** a transação faz commit
**Then** o evento é emitido só depois do commit; lance recusado ou transação revertida não emite nada

**Given** um licitante autenticado
**When** chama `GET /lots/:id`
**Then** a resposta traz também `me.alias`; visitante não recebe `me`

**Given** um lote com lances
**When** alguém chama `GET /lots/:id/bids?page=`
**Then** recebe o histórico paginado do mais recente ao mais antigo, com `seq`, alias, valor e horário, em uma query

**Given** um licitante que lidera lotes ao vivo
**When** chama `GET /wallet`
**Then** a resposta traz também a lista dos lotes que comprometem saldo (número, título, valor comprometido), lida do último lance de cada lote, sem N+1

### Story 4.6: Tela Sala do lote ao vivo (lances e tempo real)

Como licitante,
quero dar lances e ver a disputa atualizar ao vivo na sala,
para saber na hora se estou ganhando.

**Cobre:** FR14, FR17, FR24 · UX-DR3, UX-DR6

**Telas:** "Sala do lote ao vivo" em `docs/screens.md`; canvas **Sala do lote ao vivo**. Completa a sala de leitura da 3.7.

**Acceptance Criteria:**

**Given** um licitante na sala de um lote ao vivo
**When** a sala carrega
**Then** vê o formulário de lance com o mínimo aceito como ajuda e os atalhos mínimo, +1 e +2 incrementos
**And** visitante vê "Entrar para dar lance" e leiloeiro não vê o formulário

**Given** um lance enviado
**When** a API recusa
**Then** a mensagem da tabela do `screens.md` aparece para cada código, com o valor ou a data do detalhe formatados

**Given** a situação do licitante
**When** ele ainda não deu lance, lidera ou foi superado
**Then** a sala mostra o estado correspondente, derivado da comparação de `me.alias` com o alias do último lance
**And** quando a situação muda, o front busca `GET /wallet` de novo e o resumo do cabeçalho atualiza

**Given** o histórico
**When** a sala está aberta
**Then** mostra alias (ou "Você"), valor, horário e marca do líder; vazio, mostra a mensagem com o primeiro mínimo; tem link para a auditoria do lote

**Given** o stream SSE do lote
**When** chega um lance
**Then** histórico, lance atual, situação e contagem regressiva atualizam sem recarregar; prorrogado, a nota indica que o fim foi estendido
**And** ao conectar e ao reconectar, a sala refaz o `GET /lots/:id` para pegar o estado completo

**And** a tela não quebra a partir de 360px

### Story 4.7: Destaque ao vivo e lotes comprometidos na carteira

Como licitante,
quero ver o destaque da vitrine atualizar ao vivo e saber quais lotes estão segurando meu saldo,
para acompanhar minhas disputas fora da sala.

**Cobre:** FR4, FR11, FR17 · UX-DR4, UX-DR7

**Telas:** "Página inicial (vitrine)" e "Carteira" em `docs/screens.md`; canvas **Página inicial** e **Carteira**.

**Acceptance Criteria:**

**Given** a página inicial com um lote em destaque
**When** chega um lance pelo stream desse lote
**Then** lance atual, nº de lances e prazo do destaque atualizam sem recarregar, e o destaque continua o mesmo lote
**And** é o único stream aberto pela página: os cards da vitrine não atualizam ao vivo

**Given** um licitante logado que já deu lance no lote em destaque
**When** a página carrega ou chega um lance
**Then** o destaque mostra "ganhando" ou "superado"

**Given** um licitante que lidera lotes
**When** abre a Carteira
**Then** vê a lista dos lotes que comprometem saldo, com link para a sala; sem nenhum, o estado vazio da 2.4

**And** as telas não quebram a partir de 360px

---

## Épico 5: Encerramento e confiança

Lote vencido é liquidado e o vencedor recebe o comprovante assinado; a sala mostra "você arrematou" e "lote encerrado".
Licitante vê os próprios lances e arremates; qualquer pessoa audita a cadeia; o painel mostra o total recebido.

### Story 5.1: Regras de liquidação (TDD)

Como leiloeiro e licitante vencedor,
quero que o encerramento mova o dinheiro certo uma vez só,
para que o arremate seja cobrado e pago corretamente.

**Cobre:** FR18

**Notas:**
- Só regra pura em `settlement/settlement.rules.ts` (+ spec), em TDD. Sem endpoint nesta story.
- Entrada: lote (`endsAt`, `cancelledAt`, `settledAt`, `currentBid`), último lance da cadeia ou nenhum, `now`.
  Saída: não liquidar (com o motivo), fechar sem vencedor, ou liquidar (vencedor, valor, movimentos nas duas carteiras).
- Limite do fim igual ao da 4.1: o lote está encerrado quando `now >= ends_at`; a liquidação é permitida no instante exato do fim.

**Casos de teste (proposta, aguardando aprovação):**

`describe('SettlementRules.decide')`, quando liquidar:
1. não liquida um instante antes do fim
2. liquida no instante exato do fim
3. usa o fim prorrogado, não o original
4. não liquida lote já liquidado
5. não liquida lote cancelado

Resultado:
6. fecha sem vencedor quando não há lances
7. lote sem lances não move saldo de ninguém
8. vencedor é o autor do último lance da cadeia
9. cobra o valor do último lance da cadeia mesmo com `current_bid` diferente (D-042)

Movimentos:
10. debita o valor do saldo do vencedor
11. libera o comprometido do vencedor pelo mesmo valor
12. credita o valor no saldo do leiloeiro
13. libera só o valor deste lote quando o vencedor lidera outro lote

**Acceptance Criteria:**

**Given** os casos aprovados
**When** a story termina
**Then** cada caso é um `it` escrito antes da implementação, todos passam, e a regra não importa TypeORM

### Story 5.2: Liquidação e comprovante assinado na API

Como licitante vencedor,
quero que o lote encerrado seja liquidado e gere meu comprovante,
para ter a prova do arremate.

**Cobre:** FR18, FR19

**Notas:**
- Decisões que esta story implementa: D-009, D-029, D-039, D-042.
- Assinatura do comprovante em `receipts/receipt.signature.ts`, com o prefixo `receipt:` e a mesma base da cadeia (4.2).
- Gatilho desta story: acesso a lote vencido (`GET /lots/:id`). O timer entra na 5.3.
- Token do comprovante só para o vencedor no `GET /lots/:id`; o leiloeiro do lote recebe o link pelo painel (5.4).

**Casos de teste da assinatura (proposta, aguardando aprovação; família da cadeia de HMAC, em TDD):**

`describe('receiptSignature.sign')`:
1. gera a mesma assinatura para o mesmo comprovante
2. muda a assinatura quando muda o campo (`it.each` sobre `lotId`, alias do vencedor, valor, hash final, data da liquidação)
3. não coincide com um hash de lance de mesmo conteúdo (prefixo `receipt:`)

`describe('receiptSignature.verify')`:
4. aceita comprovante intacto
5. recusa comprovante com qualquer campo alterado

**Acceptance Criteria:**

**Given** a migration desta story
**When** roda
**Then** cria `receipts` com `UNIQUE (lot_id)`, token aleatório e não sequencial com `UNIQUE`, alias do vencedor, valor, hash final, data e assinatura

**Given** um lote vencido com lances, ainda não liquidado
**When** alguém chama `GET /lots/:id`
**Then** numa transação: trava o lote, relê `settled_at`, lê o último lance da cadeia, trava as carteiras do vencedor e do leiloeiro em ordem de `id`,
  aplica a regra da 5.1, grava o comprovante assinado e preenche `settled_at`
**And** depois do commit, o stream do lote emite um evento de encerramento só com dados públicos (alias do vencedor e valor)

**Given** um lote vencido sem lances
**When** é liquidado
**Then** só `settled_at` é preenchido; nenhum comprovante e nenhum movimento de saldo

**Given** duas liquidações do mesmo lote disparadas ao mesmo tempo
**When** rodam
**Then** só uma grava; a outra vê `settled_at` ou bate no `UNIQUE (lot_id)` e termina sem erro para quem chamou (teste e2e com Testcontainers)

**Given** um lote liquidado
**When** o vencedor chama `GET /lots/:id`
**Then** a resposta traz o resultado (alias do vencedor e valor) e, só para o vencedor, o token do comprovante

**And** o e2e cobre o caso da D-042: `current_bid` alterado no banco e a liquidação cobrando o valor do último lance da cadeia

### Story 5.3: Timer de liquidação em memória

Como leiloeiro,
quero que o lote seja liquidado na hora do fim mesmo sem ninguém acessar,
para receber o crédito sem depender de visita.

**Cobre:** FR18

**Notas:** decisão que esta story implementa: D-009. Sem cron e sem `@nestjs/schedule`.

**Acceptance Criteria:**

**Given** a API subindo
**When** o boot termina
**Then** liquida os lotes já vencidos e não liquidados, e arma um timer para o próximo `ends_at` entre os não liquidados

**Given** um lance que prorroga o fim, ou um lote novo que encerra antes do próximo timer
**When** o commit acontece
**Then** o timer é recalculado para o próximo `ends_at`

**Given** o timer disparando
**When** liquida o lote
**Then** usa o mesmo service da 5.2 e arma o timer seguinte; se houver vários lotes no mesmo instante, liquida todos

**Given** um `ends_at` acima do limite do `setTimeout` (~24,8 dias, caso do lote do seed)
**When** o timer é armado
**Then** dispara no limite e reagenda, sem estourar

**And** o timer é testado com o `Clock` e timers falsos do Jest, sem esperar tempo real

### Story 5.4: Comprovante, meus lances e resultado do painel na API

Como licitante e leiloeiro,
quero consultar comprovantes, meus lances e o total recebido,
para acompanhar o que arrematei e o que vendi.

**Cobre:** FR9 (total recebido e resultado), FR19, FR20

**Acceptance Criteria:**

**Given** um token de comprovante
**When** qualquer pessoa chama `GET /receipts/:token`
**Then** recebe número, título, artista, valor, alias do vencedor, data da liquidação, hash final e `valid`, com a assinatura verificada nessa requisição
**And** token inexistente responde 404; nenhum dado pessoal aparece

**Given** um licitante autenticado
**When** chama `GET /my-bids?section=ongoing|won|lost&page=`
**Then** recebe, paginado: em andamento (lotes ao vivo em que deu lance, com situação, lance atual e fim), arrematados (valor, data e token)
  e não arrematados (valor final e o seu maior lance), sem N+1

**Given** um leiloeiro
**When** chama `GET /dashboard/summary` e `GET /dashboard/lots`
**Then** o resumo traz o total recebido (soma dos comprovantes dos seus lotes) e cada lote encerrado traz o resultado (arrematado por R$ X ou sem lances) e o token do comprovante

**And** cada rota dispara um número fixo de queries (conferido no log)

### Story 5.5: Auditoria da cadeia na API (TDD)

Como qualquer pessoa,
quero verificar se o histórico de um lote foi adulterado,
para confiar no resultado.

**Cobre:** FR22

**Notas:** decisão que esta story implementa: D-012. Verificação pura em `audit/chain.ts`, ao lado do `hashBid` da 4.2.
Resultado: `intact`, `tampered` (com o `seq` do primeiro lance quebrado) ou `truncated`. `tampered` tem prioridade;
`truncated` só quando a cadeia está intacta e o selo não bate.

**Casos de teste (proposta, aguardando aprovação):**

`describe('chain.verify')`:
1. declara íntegra a cadeia sem alteração
2. declara íntegro o lote sem lances com selo intacto
3. aponta o lance com valor alterado
4. aponta o lance com dono trocado
5. aponta o lance com data alterada
6. aponta o lance seguinte a um lance removido do meio
7. aponta o lance inserido no meio da cadeia
8. aponta o lance acrescentado no fim sem assinatura válida
9. detecta lances removidos do fim pelo selo
10. aponta só o primeiro lance quebrado quando há vários
11. detecta dois lances com a ordem trocada
12. prioriza adulteração quando a cadeia quebra e o selo também não bate

**Acceptance Criteria:**

**Given** os casos aprovados
**When** a story termina
**Then** cada caso é um `it` escrito antes da implementação e todos passam

**Given** um lote existente e não cancelado
**When** qualquer pessoa chama `GET /lots/:id/audit`
**Then** recebe número, título, status, o resultado e a lista completa dos lances
  com `seq`, alias, valor, horário, hash e um indicador por lance
**And** a lista vem de uma query só; lote inexistente responde 404

**Given** um número de lote
**When** alguém chama `GET /lots/number/:number`
**Then** recebe o id do lote para abrir a auditoria; número inexistente ou lote cancelado responde 404

**And** um e2e adultera o banco direto (`UPDATE` no valor, `DELETE` do último lance) e confere que a rota acusa cada caso

### Story 5.6: Sala encerrada e tela Comprovante de arremate

Como licitante vencedor,
quero ver na sala que arrematei e abrir o comprovante para compartilhar,
para provar o arremate.

**Cobre:** FR19 · UX-DR6, UX-DR9

**Telas:** "Sala do lote ao vivo" (situações de encerramento) e "Comprovante de arremate" em `docs/screens.md`;
canvas **Sala do lote ao vivo** e **Comprovante de arremate**.

**Acceptance Criteria:**

**Given** a sala de um lote que encerra enquanto está aberta
**When** a contagem chega a zero ou chega o evento de encerramento
**Then** a sala refaz o `GET /lots/:id`, o selo muda para Encerrado e o formulário de lance some

**Given** o vencedor na sala de um lote liquidado
**When** a sala carrega
**Then** mostra "você arrematou" com o valor debitado e o link do comprovante, e o resumo da carteira atualiza

**Given** um licitante que não venceu, um visitante ou o leiloeiro
**When** abre a sala de um lote encerrado
**Then** vê "lote encerrado" com o resultado (alias do vencedor e valor, ou sem lances)

**Given** `/receipts/:token` aberto sem login
**When** a página carrega
**Then** mostra número, título, imagem, artista, valor, alias do vencedor, data, o selo "Comprovante válido" ou "Comprovante inválido",
  o hash final abreviado com opção de copiar, link para a auditoria e botão de copiar o link
**And** token inexistente mostra "Comprovante não encontrado"; a tela tem os estados carregando e erro

**And** as telas não quebram a partir de 360px

### Story 5.7: Tela Meus lances e resultado no painel

Como licitante,
quero ver meus lances em andamento, arrematados e perdidos,
para acompanhar tudo em um lugar.

**Cobre:** FR9, FR20 · UX-DR8, UX-DR11

**Telas:** "Meus lances" e "Painel do leiloeiro" (resumo e livro) em `docs/screens.md`; canvas **Meus lances** e **Painel do leiloeiro**.

**Acceptance Criteria:**

**Given** um licitante em `/my-bids`
**When** a página carrega
**Then** vê as seções Em andamento (situação, lance atual, tempo restante), Arrematados (valor, data, link do comprovante e botão de copiar o link)
  e Não arrematados (valor final e o seu maior lance), paginadas
**And** sem nenhum lance, vê "Você ainda não deu lances" com link para a vitrine; carregando e erro tratados

**Given** um leiloeiro no painel
**When** a página carrega
**Then** o resumo mostra o total recebido e cada lote encerrado no livro mostra o resultado e o link do comprovante quando arrematado

**And** leiloeiro ou visitante em `/my-bids` é redirecionado; a tela não quebra a partir de 360px

### Story 5.8: Tela Auditoria do lote e campo da página inicial

Como qualquer pessoa,
quero abrir a auditoria de um lote e ver se ele está íntegro,
para confiar no histórico sem precisar de login.

**Cobre:** FR22 · UX-DR4, UX-DR10

**Telas:** "Auditoria do lote" e o bloco de auditoria da "Página inicial (vitrine)" em `docs/screens.md`;
canvas **Auditoria do lote** e **Página inicial**.

**Acceptance Criteria:**

**Given** `/lots/:id/audit` aberto sem login
**When** a página carrega
**Then** mostra número, título e status, o resultado Íntegro ou Adulterado (com o primeiro lance quebrado ou "lances removidos do fim"),
  a lista completa com seq, alias, valor, horário, hash abreviado e o indicador por lance, e a explicação curta com link para o README
**And** lote inexistente mostra 404; carregando e erro tratados

**Given** o campo de auditoria da página inicial
**When** o usuário digita "7" ou "VII"
**Then** o front converte com o helper da 3.6, chama `GET /lots/number/:number` e abre a auditoria; número inexistente mostra "lote não encontrado"

**Given** a sala, o card da vitrine e o comprovante
**When** esta story termina
**Then** todos têm o link "Auditar este lote"

**And** a tela não quebra a partir de 360px

---

## Épico 6: Entrega

Seed idempotente também no deploy, compose verificado num checkout limpo, consistência da API e do front, documentação, cancelamento com estorno, polimento final e README final.

### Story 6.1: Seed idempotente e compose verificado

Como avaliador,
quero um ambiente com dados prontos, local e no deploy,
para percorrer o fluxo sem montar tudo do zero.

**Cobre:** FR25, FR26

**Notas:**
- Decisões que esta story implementa: D-020, D-045. Seed em `api/src/seed/`, com o contexto do Nest e os mesmos services da aplicação (cadastro, depósito, criação de lote com download da imagem, lance).
- Em produção roda da máquina local com a External Database URL e o mesmo `BID_HMAC_SECRET` do Render (`docs/deploy-notes.md`).

**Acceptance Criteria:**

**Given** um banco vazio
**When** roda o comando do seed
**Then** cria um leiloeiro, dois licitantes com saldo depositado e lotes pelo fluxo do leiloeiro, incluindo ao menos um lote ao vivo
  que termina em ~30 dias, com lances dos dois licitantes passando pelo motor de lances
**And** a auditoria desse lote dá `intact`

**Given** o mesmo seed
**When** termina
**Then** também existe um lote encerrado e liquidado, criado com o `Clock` deslocado para o passado e liquidado pelo service de liquidação (D-045)
**And** a auditoria dele dá `intact`, o comprovante abre com "Comprovante válido", e a aba Encerrados e o total recebido do painel já mostram esse lote

**Given** o seed já aplicado
**When** roda de novo
**Then** termina sem erro e sem duplicar usuários, lotes ou lances (idempotente, identificado pelos e-mails do seed)

**Given** a Cleveland fora do ar
**When** o seed roda
**Then** falha com mensagem clara e pode ser rodado de novo depois, sem deixar dado pela metade

**Given** um checkout limpo do repositório
**When** roda `docker compose up`
**Then** banco, API e web sobem, as migrations rodam no boot e o comando do seed documentado funciona contra o banco do compose

**And** as credenciais do seed ficam no README; `docs/deploy-notes.md` tem o passo a passo do dia da entrega (recriar o banco, rodar o seed, conferir)

### Story 6.2: Consistência da API

Como avaliador,
quero uma API com os mesmos padrões em todos os módulos,
para ler qualquer parte do código sem estranhar.

**Notas:** revisão transversal do `/api` contra o `CLAUDE.md` (nomes, controllers finos, códigos de domínio, DTOs de resposta em classe,
paginação e colunas selecionadas, sem N+1). Os itens concretos e os casos de teste são definidos na abertura da story.

**Acceptance Criteria:**

**Given** os módulos do `/api`
**When** a story termina
**Then** os pontos levantados na abertura estão resolvidos, sem mudança de contrato não registrada em `web/src/shared/api/types.ts`
**And** lint, testes unitários, e2e e build passam

### Story 6.3: Consistência do front

Como avaliador,
quero telas construídas com os mesmos componentes e o mesmo padrão de chamada à API,
para o front parecer um produto só.

**Notas:** itens da seção "Revisão final" do `docs/stories/deferred-work.md`: componentes únicos em `shared/ui` (esqueleto, erro com
"Tentar de novo", abas), padrão único de chamada à API e tipografia e espaçamentos fluidos com `clamp()`.

**Acceptance Criteria:**

**Given** as telas do `/web`
**When** a story termina
**Then** esqueleto, estado de erro e abas vêm de um componente só em `shared/ui`, e toda tela chama a API pelo mesmo padrão
**And** nenhuma tela quebra ou rola na horizontal em 360, 768, 1024, 1280 e 1920px

### Story 6.4: Documentação

Como avaliador,
quero os documentos de `docs/` atualizados e fáceis de ler,
para entender as decisões e o deploy sem ler o código.

**Notas:** `decisions.md`, `deploy-notes.md`, `ai-log.md` (reescrita das entradas antigas no estilo novo, item do `deferred-work.md`)
e lista de códigos de erro do `CLAUDE.md`.

**Acceptance Criteria:**

**Given** os arquivos de `docs/`
**When** a story termina
**Then** refletem o sistema entregue, sem link quebrado
**And** as entradas do `ai-log.md` seguem o estilo das regras do `CLAUDE.md`

### Story 6.5: Cancelamento com estorno

Como leiloeiro,
quero cancelar um lote que já recebeu lances,
para retirar uma peça sem prender o saldo dos licitantes.

**Notas:** hoje só lote sem lances é cancelável (`LOT_HAS_BIDS`). Os lances continuam na cadeia (tabela append-only);
o estorno libera o saldo comprometido do licitante que lidera. Regra, códigos e casos de teste definidos na abertura da story.

**Acceptance Criteria:**

**Given** um lote ao vivo ou agendado com lances
**When** o leiloeiro dono cancela
**Then** o lote sai da vitrine, o comprometido do licitante que lidera é liberado na mesma transação, com lock do lote e das carteiras
**And** a auditoria do lote continua íntegra

### Story 6.6: Polimento final

Como avaliador,
quero as telas sem arestas de uso,
para percorrer o fluxo sem tropeçar em detalhe visual.

**Notas:** itens da seção "Polimento visual" do `docs/stories/deferred-work.md`.

**Acceptance Criteria:**

**Given** os itens de polimento registrados
**When** a story termina
**Then** cada um está feito ou declarado fora do escopo
**And** as telas tocadas foram conferidas em 360, 768, 1024 e 1280px

### Story 6.7: README final

Como avaliador,
quero um README que me deixe rodar, testar e entender o sistema,
para avaliar sem precisar ler o código primeiro.

**Cobre:** NFR10

**Notas:** segue a seção README do `CLAUDE.md` (seções fixas, orçamento de linhas, proibições). Detalhe mora em `docs/`.

**Acceptance Criteria:**

**Given** o README
**When** a story termina
**Then** tem as seções fixas na ordem do `CLAUDE.md`: Ágora, Testar agora, Rodar local, Arquitetura, Auditoria, Comportamentos esperados, Testes, Stack e decisões, Fora do escopo, Uso de IA
**And** "Fora do escopo" declara Swagger, tema escuro e limite de tentativas no login (`deferred-work.md`)
**And** o conteúdo de `docs/deploy-notes.md` passa para o README e o arquivo é apagado
**And** passa no job do CI de no máximo 300 linhas

**Given** a seção Auditoria
**When** o avaliador lê
**Then** entende como alteração, remoção do meio, remoção do fim e inserção são detectadas, e a limitação de restaurar lote e lances inteiros

**Given** a seção Comportamentos esperados
**When** o avaliador lê
**Then** encontra, uma linha cada com o porquê: anti-sniping, cold start, liquidação no acesso e no timer, cards sem tempo real, saldo do leiloeiro,
  JWT de 8h sem refresh, eventos em memória numa instância, banco recriado na entrega

**Given** a seção Testar agora
**When** o avaliador segue o roteiro
**Then** consegue entrar com as credenciais do seed, dar um lance no lote ao vivo e abrir a auditoria, com os links do app e da API

**And** `docs/ai-log.md` tem a entrada de cada story; nenhum link do README está quebrado
