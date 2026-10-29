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
  status: feito na 4.4 (`spec-4-4-testcontainers-ci-e-lances-simultaneos.md`).
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
  status: feito na 4.4 (`spec-4-4-testcontainers-ci-e-lances-simultaneos.md`).

- source_spec: `docs/stories/spec-4-3-dar-lance-na-api.md`
  summary: na 4.6, traduzir `LOT_INTEGRITY_FAILED` (409) na sala do lote.
  evidence: decisão do usuário na revisão da 4.3 (D-059); o lance passa a ser recusado quando o selo do lote não confere com a cadeia.
  status: feito na 4.6 (`spec-4-6-tela-sala-do-lote-ao-vivo-lances-e-tempo-real.md`).

- source_spec: `docs/stories/spec-4-6-tela-sala-do-lote-ao-vivo-lances-e-tempo-real.md`
  summary: na 5.8, link "Auditar este lote" no cabeçalho do histórico da sala, como no canvas `Sala.dc.html`.
  evidence: a tela de auditoria do lote só existe a partir da 5.8; decisão do usuário na spec da 4.6.

- source_spec: `docs/stories/spec-4-3-dar-lance-na-api.md`
  summary: na 6.4 (era a 6.2 antes do replanejamento do épico 6), reescrever as entradas antigas do `docs/ai-log.md` no estilo novo: frases curtas, português corrente, detalhe técnico só quando for indispensável.
  evidence: pedido do usuário na 4.3, junto com o "Resumo" do topo do ai-log e a regra nova no CLAUDE.md.

- source_spec: `docs/stories/spec-4-7-destaque-ao-vivo-e-lotes-comprometidos-na-carteira.md`
  summary: virada de status do destaque com a página aberta: o destaque agendado continua "Agendado / Abre em" com a data passada depois de `startsAt`, e o ao vivo continua "Ao vivo" com a contagem em 00:00 depois de `endsAt`; buscar o lote de novo na virada, como faz a sala.
  evidence: achado #1 da revisão da 3.6 (rejeitado na época); a 4.7 trouxe o stream ao destaque e manteve o status do carregamento, por decisão do usuário na spec.
- source_spec: `docs/stories/spec-4-7-destaque-ao-vivo-e-lotes-comprometidos-na-carteira.md`
  summary: na Carteira, lote comprometido que vence com a página aberta continua "Você lidera · encerra {data}" até recarregar, em vez de "Você arrematou · aguardando liquidação"; a hora é lida uma vez ao abrir a página.
  evidence: achado #2 da revisão da 4.7; decisão do usuário de manter como está e registrar junto da virada de status do destaque.

- source_spec: `docs/stories/spec-5-1-regras-de-liquidacao-tdd.md`
  summary: na 5.2, conferir o selo do lote contra a cadeia antes de mover saldo (D-059); selo inválido não liquida e registra o motivo.
  evidence: a regra da 5.1 confia no último lance recebido; quem apagasse o último lance direto no banco faria a liquidação cobrar o penúltimo licitante, cujo comprometido já foi liberado quando ele foi superado: a liquidação consumiria a reserva de outro lote dele ou falharia no `CHECK` do comprometido.

## Revisão final (story 6.3, Consistência do front)

- source_spec: `docs/stories/spec-4-4-testcontainers-ci-e-lances-simultaneos.md`
  summary: unificar o CSS duplicado entre telas como componentes em `shared/ui` (`Skeleton`, `ErrorState`, `Tabs`): esqueleto de carregamento (painel, sala, vitrine, carteira), estado de erro com "Tentar de novo" (as mesmas quatro) e abas (painel, login, vitrine), hoje reescritos com o prefixo de cada tela.
  evidence: pedido do usuário na aprovação da 4.4.
  extra: junto da unificação, tipografia e espaçamentos fluidos com `clamp()` pelos tokens (largura máxima do conteúdo, títulos, texto base, espaços entre seções e componentes), para a proporção crescer em telas grandes e encolher no celular; conferir todas as telas em 360, 768, 1024, 1280 e 1920px (pedido do usuário na 4.7).
- source_spec: `docs/stories/spec-4-4-testcontainers-ci-e-lances-simultaneos.md`
  summary: padrão único de chamada à API no front: hoje algumas telas usam hook (`use-dashboard`, `use-wallet`) e outras chamam a API direto no componente (`lot-form`, `catalog-search`, `ledger`, `deposit-form`); escolher um padrão e aplicar em todas.
  evidence: pedido do usuário na aprovação da 4.4.

## Polimento visual (story 6.6)

- source_spec: `docs/stories/spec-3-5-tela-painel-do-leiloeiro.md`
  summary: no painel do leiloeiro em modo cartão (abaixo de 1220px), o selo de estado e o botão "Cancelar lote" ocupam toda a largura da coluna; devem ter a largura do próprio conteúdo (`justify-self: start`), com o botão em largura total só abaixo de 480px. Alinhar a miniatura da obra com o título. Conferir em 360, 768 e 1000px.
  evidence: pedido do usuário durante a implementação da 3.6.
- source_spec: `docs/stories/spec-4-6-tela-sala-do-lote-ao-vivo-lances-e-tempo-real.md`
  summary: no painel do leiloeiro, ao escolher uma obra no acervo, rolar até a ficha do lote e levar o foco ao primeiro campo; no celular, hoje é preciso rolar manualmente para encontrá-la.
  evidence: pedido do usuário na conferência da 4.6.
- source_spec: `docs/stories/spec-5-6-sala-encerrada-e-tela-comprovante-de-arremate.md`
  summary: no painel do leiloeiro, ao lado do campo de busca do acervo, um ícone de sugestões que abre uma pequena lista de termos que dão resultado nos dois departamentos (ex.: "portrait", "Rembrandt", "Madonna", "marble", "amphora"); clicar num termo preenche o campo e faz a busca. Conferir antes, na API da Cleveland, que cada termo retorna obras com imagem.
  evidence: pedido do usuário na conferência da 5.6.

- source_spec: `docs/stories/spec-5-2-liquidacao-e-comprovante-assinado-na-api.md`
  summary: na 5.3, se o timer chamar a liquidação por um caminho sem o lock do lote, cobrir com teste o `ignoreDuplicate` (violação de `receipts_lot_id` termina sem erro e sem evento).
  evidence: achado da revisão da 5.2 (maybe-false, seria medium); hoje o `FOR UPDATE` no lote serializa as liquidações e a segunda sempre vê `settled_at`, então o caminho não é alcançado.

- source_spec: `docs/stories/spec-5-3-timer-de-liquidacao-em-memoria.md`
  summary: na 6.1, o script do seed chama `app.close()` no final, inclusive em caso de erro (`try/finally`), e avalia trocar o `SettlementTimer` por um falso no contexto do seed, como no e2e.
  evidence: o seed sobe a aplicação e, com ela, o `SettlementTimer`; sem `app.close()`, o processo fica pendurado no timer do lote ao vivo de ~30 dias. Com o timer ligado, ele pode liquidar no meio da criação dos dados com o `Clock` deslocado (D-045).

- source_spec: `docs/stories/spec-5-6-sala-encerrada-e-tela-comprovante-de-arremate.md`
  summary: na 5.8, adicionar o link "Auditar este lote" no comprovante (`/receipts/:token`, ao lado de "Copiar link", como no canvas Comprovante.dc.html) e na sala do lote, apontando para `/lots/:id/audit`.
  evidence: a tela de auditoria só existe a partir da 5.8; a spec da 5.6 proíbe o link antes disso.

- source_spec: `docs/stories/spec-5-6-sala-encerrada-e-tela-comprovante-de-arremate.md`
  summary: na 6.1, a tela Entrar ganha uma caixa "Contas de demonstração" com três botões (leiloeiro, licitante 1, licitante 2) que preenchem e-mail e senha das contas do seed, com um aviso curto de que são contas de demonstração e a dica de entrar com o outro licitante numa janela anônima para testar o tempo real. As credenciais vêm de um único lugar compartilhado com o seed e o README.
  evidence: pedido do usuário na conferência da 5.6.

- source_spec: `docs/stories/spec-5-6-sala-encerrada-e-tela-comprovante-de-arremate.md`
  summary: composição do seed da 6.1, tudo do mesmo leiloeiro e pelos services (D-020, D-045): 1 leiloeiro e 2 licitantes (Ana e Bia) com saldo; 4 lotes ao vivo terminando em ~30 dias (um disputado com ~8 lances alternados, um em que a Ana lidera, um em que a Bia lidera e um sem lances); 2 agendados abrindo em 2 e 7 dias; 3 encerrados e liquidados com o Clock no passado (um arrematado pela Ana, um pela Bia e um sem lances); 1 cancelado; obras dos dois departamentos.
  evidence: pedido do usuário na conferência da 5.6.

- source_spec: `docs/stories/spec-5-6-sala-encerrada-e-tela-comprovante-de-arremate.md`
  summary: na 6.1, o seed cria um lote extra encerrado e liquidado pelos services, com pelo menos 4 lances, e depois o adultera de propósito com um `UPDATE` direto no valor de um lance do meio. O passo é idempotente (só adultera se ainda não foi adulterado) e nunca toca em lote ao vivo; a auditoria desse lote precisa dar `tampered` apontando esse lance.
  evidence: pedido do usuário na conferência da 5.6, para o avaliador ver a auditoria acusar uma adulteração sem precisar provocá-la.

- source_spec: `docs/stories/spec-5-6-sala-encerrada-e-tela-comprovante-de-arremate.md`
  summary: na 6.1, o roteiro do README avisa qual lote do seed foi adulterado de propósito e por quê, e ganha uma seção curta "Testar a adulteração você mesmo" com 3 comandos SQL para o banco do docker compose (mudar o valor de um lance, apagar o último lance, mudar o valor de um comprovante), cada um com o resultado esperado na auditoria e no comprovante.
  evidence: pedido do usuário na conferência da 5.6.

- source_spec: `docs/stories/spec-5-7-tela-meus-lances-e-resultado-no-painel.md`
  summary: na 5.8, adicionar o link "Auditar lote" na aba Não arrematados de Meus lances (ação da linha, como no canvas MeusLances.dc.html), apontando para `/lots/:id/audit`.
  evidence: a tela de auditoria só existe a partir da 5.8; a spec da 5.7 proíbe o link antes disso.

- source_spec: none
  summary: na 6.6, no painel do leiloeiro, depois de escolher a obra no acervo, rolar até os campos da ficha do lote.
  evidence: pedido do usuário no replanejamento do épico 6 (2026-10-28); reforça o item de rolagem registrado na 4.6.

- source_spec: none
  summary: na 6.6, no livro de lotes do painel, tirar o botão "Abrir sala" e transformar o título do lote em link para a sala.
  evidence: pedido do usuário no replanejamento do épico 6 (2026-10-28).

- source_spec: none
  summary: na 6.6, abaixo de ~420px, o menu do cabeçalho quebra em duas linhas, alinhado à esquerda, com o espaço normal entre os links (hoje fica com 4px).
  evidence: pedido do usuário no replanejamento do épico 6 (2026-10-28).

- source_spec: `docs/stories/spec-5-6-sala-encerrada-e-tela-comprovante-de-arremate.md`
  summary: na 6.6, o ícone de sugestões ao lado da busca do acervo no painel (item registrado na 5.6, na seção acima).
  evidence: pedido do usuário no segundo replanejamento do épico 6 (2026-10-28).

## Cancelamento com estorno (story 6.5)

- source_spec: none
  summary: story 6.5 nova: leiloeiro cancela lote com lances e os compromissos dos licitantes são estornados; escopo e casos definidos na abertura da story.
  evidence: decisão do usuário no segundo replanejamento do épico 6 (2026-10-28); sai da lista de "Fora do escopo".

## README final (story 6.7)

- source_spec: none
  summary: na 6.7, o conteúdo de `docs/deploy-notes.md` é absorvido pelo README e o arquivo é apagado.
  evidence: decisão do usuário no segundo replanejamento do épico 6 (2026-10-28).

## Fora do escopo (README, story 6.7)

- source_spec: none
  summary: documentação da API com Swagger (antiga story 6.3, FR27) não será feita; declarar em "Fora do escopo" no README.
  evidence: decisão do usuário no replanejamento do épico 6 (2026-10-28).

- source_spec: none
  summary: tema escuro não será feito; declarar em "Fora do escopo" no README.
  evidence: decisão do usuário no replanejamento do épico 6 (2026-10-28).

- source_spec: none
  summary: limite de tentativas no `POST /auth/login` não será feito (item registrado na 2.1); declarar em "Fora do escopo" no README.
  evidence: decisão do usuário no replanejamento do épico 6 (2026-10-28).

- source_spec: `docs/stories/spec-6-1-seed-idempotente-e-compose-verificado.md`
  summary: atualizar no CLAUDE.md a regra "O lote ao vivo do seed termina em ~30 dias" para a janela decidida na 6.1 (ao vivo encerrando entre 7 e 10 dias depois do seed; agendados abrindo entre 5 e 6 dias).
  evidence: achado da revisão da 6.1; a spec segue a decisão do usuário e o CLAUDE.md ficou com o valor antigo.

- source_spec: `docs/stories/spec-6-5-cancelamento-com-estorno.md`
  summary: Atualizar o `CLAUDE.md` para o cancelamento com estorno ("Gerenciar é: criar, cancelar sem lances..." e o exemplo de "Fora do escopo" que cita o estorno).
  evidence: depois da D-070, o lote ao vivo com lances é cancelável; arquivo de contexto do agente, só o usuário decide a redação. Resolvido na própria 6.5, a pedido do usuário.
