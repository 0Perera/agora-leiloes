- source_spec: `docs/stories/spec-2-1-cadastro-e-login-na-api.md`
  summary: testes HTTP de auth com Testcontainers (expiração de 8h do token, cadastro simultâneo virando EMAIL_TAKEN via 23505, filter e pipe globais, 401 de /auth/me)
  evidence: hoje só há testes unitários e curl manual; a story 2.1 deixou o e2e para quando o Testcontainers entrar no épico 4.
- source_spec: `docs/stories/spec-2-1-cadastro-e-login-na-api.md`
  summary: limite de tentativas no POST /auth/login (força bruta ilimitada; o scrypt só encarece cada tentativa)
  evidence: fora do escopo da 2.1; se não for implementado, declarar em "Fora do escopo" no README.
- source_spec: `docs/stories/spec-2-4-tela-carteira.md`
  summary: story opcional "Pagamento simulado no depósito", depois do épico 5, só no front: escolha entre Pix (QR ilustrativo + botão "Simular pagamento confirmado") e Cartão (cartão de teste já preenchido •••• 4242 + botão "Pagar (simulado)"), com o aviso "Pagamento simulado, nenhum dado é enviado", sem campos de cartão para digitar e sem mudança na API. Limite de 45 minutos.
  evidence: pedido do usuário no teste da 2.4; hoje o depósito é direto, sem meio de pagamento (declarado em "Fora do escopo" no README).
- source_spec: `docs/stories/spec-3-3-vitrine-destaque-e-detalhe-do-lote-na-api.md`
  summary: testes de integração da vitrine para a story 4.4 (Testcontainers): lote cancelado fora de GET /lots, /lots/featured e /lots/:id; counts das três abas com q aplicado; ordem de cada aba.
  evidence: pedido do usuário na aprovação da 3.3; hoje a story só tem testes unitários, e a infraestrutura de Testcontainers entra na 4.4.
- source_spec: `docs/stories/spec-3-3-vitrine-destaque-e-detalhe-do-lote-na-api.md`
  summary: comportamento conhecido aceito: em GET /lots, itens e counts saem de duas queries e podem divergir por instantes se um lote é criado, cancelado ou muda de status entre elas.
  evidence: achado da revisão da 3.3; o próximo GET corrige, e alinhar exigiria transação REPEATABLE READ ou COUNT(*) OVER (). O usuário aceitou como está.
- source_spec: `docs/stories/spec-3-3-vitrine-destaque-e-detalhe-do-lote-na-api.md`
  summary: comportamento conhecido aceito: GET /lots/:id/image continua servindo a imagem de lote cancelado, enquanto GET /lots/:id responde 404.
  evidence: achado da revisão da 3.3; comportamento vindo da 3.2, a imagem é de acervo público e tem cache imutável. O usuário aceitou como está.
- source_spec: `docs/stories/spec-3-4-painel-do-leiloeiro-na-api.md`
  summary: na story 4.3, trocar a checagem "tem lance" do cancelamento (POST /lots/:id/cancel) de `bid_count > 0` para `EXISTS` na tabela `bids`, depois do lock do lote.
  evidence: decisão do usuário na aprovação da 3.4; `bid_count` é só cache de exibição (D-042) e a tabela `bids` ainda não existe.
  status: feito na 4.3 (`spec-4-3-dar-lance-na-api.md`).

- source_spec: `docs/stories/spec-3-5-tela-painel-do-leiloeiro.md`
  summary: na 3.7, adicionar a ação "Abrir sala" na coluna Ação do livro de lotes do painel.
  evidence: a rota `/lots/:id` só existe a partir da 3.7; o usuário pediu para registrar aqui.
  status: feito na 3.7 (`spec-3-7-tela-sala-do-lote-ao-vivo-leitura.md`).

- source_spec: `docs/stories/spec-4-1-regras-de-lance-saldo-comprometido-e-anti-sniping-tdd.md`
  summary: na 4.3, teste de serviço em que o licitante superado volta a dar lance e compromete o valor cheio do novo lance (o compromisso anterior já foi liberado quando ele foi superado).
  evidence: achado da revisão da 4.1; a regra pura não recebe o lance anterior do licitante, então o caso 19 não distingue valor cheio de diferença. Pedido do usuário.
  status: feito na 4.3 (`spec-4-3-dar-lance-na-api.md`).

- source_spec: `docs/stories/spec-4-1-regras-de-lance-saldo-comprometido-e-anti-sniping-tdd.md`
  summary: na 4.3, ligar os códigos de recusa da regra (`BidDecision`) ao `DomainCode`, para um código renomeado ou digitado errado não compilar.
  evidence: achado da revisão da 4.1; hoje o tipo da recusa repete os códigos como literais soltos. Pedido do usuário.
  status: feito na 4.3 (`spec-4-3-dar-lance-na-api.md`).

- source_spec: `docs/stories/spec-4-2-cadeia-de-hmac-selo-e-alias-tdd.md`
  summary: na 4.3, o `created_at` do lance vem do `Clock` da aplicação e é gravado explicitamente, nunca do `now()` do banco.
  evidence: o Postgres guarda microssegundos e o hash usa `toISOString()` com milissegundos; com `now()`, a verificação da cadeia falharia em todo lance. Pedido do usuário.
  status: feito na 4.3 (`spec-4-3-dar-lance-na-api.md`).

- source_spec: `docs/stories/spec-4-2-cadeia-de-hmac-selo-e-alias-tdd.md`
  summary: na 5.5, o verificador aceita `GENESIS` como `prev_hash` só no primeiro lance (`seq` 1) e exige, em todos os outros, `prev_hash` igual ao hash do lance anterior.
  evidence: achado da revisão da 4.2; `hashBid` trata `null` e `GENESIS` igual e não confere o `seq`, então essa checagem fica com o verificador.

- source_spec: `docs/stories/spec-4-3-dar-lance-na-api.md`
  summary: na 5.5, selo nulo em `lots.seal` conta como lote não íntegro.
  evidence: decisão do usuário na 4.3 (D-058); o selo vazio é gravado na criação do lote, então selo nulo só existe em lote criado antes da migration da 4.3, e em produção o banco é recriado na entrega.

- source_spec: `docs/stories/spec-4-3-dar-lance-na-api.md`
  summary: na 4.4, teste HTTP de `POST /lots/:id/bids` com 403 `ROLE_NOT_ALLOWED` para leiloeiro e 401 sem token.
  evidence: achado da revisão da 4.3; trocar ou remover o `@Auth('BIDDER')` da rota deixa a suíte verde, e o repo cobre a borda HTTP com Testcontainers a partir da 4.4.

- source_spec: `docs/stories/spec-4-3-dar-lance-na-api.md`
  summary: na 4.6, traduzir `LOT_INTEGRITY_FAILED` (409) na sala do lote.
  evidence: decisão do usuário na revisão da 4.3 (D-059); o lance passa a ser recusado quando o selo do lote não confere com a cadeia.

- source_spec: `docs/stories/spec-4-3-dar-lance-na-api.md`
  summary: na 6.2, reescrever as entradas antigas do `docs/ai-log.md` no estilo novo: frases curtas, português corrente, detalhe técnico só quando for indispensável.
  evidence: pedido do usuário na 4.3, junto com o "Resumo" do topo do ai-log e a regra nova no CLAUDE.md.

## Polimento visual

- source_spec: `docs/stories/spec-3-5-tela-painel-do-leiloeiro.md`
  summary: no painel do leiloeiro em modo cartão (abaixo de 1220px), o selo de estado e o botão "Cancelar lote" ocupam toda a largura da coluna; devem ter a largura do próprio conteúdo (`justify-self: start`), com o botão em largura total só abaixo de 480px. Alinhar a miniatura da obra com o título. Conferir em 360, 768 e 1000px.
  evidence: pedido do usuário durante a implementação da 3.6.
