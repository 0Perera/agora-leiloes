# Ágora

Casa de leilões online de arte clássica europeia, com lances ao vivo e histórico auditável.

_(o que faz: lista curta de funcionalidades)_

- App: https://agora-web-gp1g.onrender.com
- API: https://agora-api-w6z9.onrender.com (status em [`/health`](https://agora-api-w6z9.onrender.com/health))

## Testar agora

> O primeiro acesso pode levar até 1 min: a API dorme após 15 min sem tráfego (plano free do Render).

Contas de demonstração (também na tela Entrar, que preenche o formulário com um clique), todas com a senha `Agora2026!`:

| E-mail | Papel |
|---|---|
| `leiloeiro@agora.dev` | Leiloeiro (Casa Ágora), dono de todos os lotes |
| `geovanna@agora.dev` | Licitante |
| `felipe@agora.dev` | Licitante |

O seed cria 11 lotes: 4 ao vivo (um disputado, um liderado por cada licitante e um sem lances), 2 agendados, 3 encerrados e liquidados (um para cada licitante e um sem lances), 1 cancelado e 1 adulterado de propósito.

Roteiro curto: entre como Geovanna e dê um lance no lote liderado por Felipe; em outra janela, entre como Felipe e veja o lance chegar ao vivo; entre como Casa Ágora e veja no painel os encerrados e o total recebido; abra o comprovante de um lote encerrado e a auditoria de qualquer lote.

**Lote adulterado:** o lote nº 11 (_Portrait of a Family Playing Music_, Pieter de Hooch) foi encerrado e liquidado normalmente, e depois o valor do lance 3 foi trocado de R$ 55.000 para R$ 30.000 direto no banco. A auditoria dele acusa `tampered` no lance 3, para mostrar a detecção sem ninguém precisar mexer no banco.

**Testar a adulteração você mesmo** (só no ambiente local do compose, nunca em produção). Os comandos mexem só nos lotes encerrados 7 e 8, então os lotes ao vivo continuam aceitando lances:

```bash
psql() { docker compose exec db psql -U agora -d agora -c "$1"; }
# 1. Valor de um lance: o lote 8 passa a "Adulterado" no lance 2. Desfazer: o mesmo com "- 100000".
psql "UPDATE bids SET amount = amount + 100000 WHERE seq = 2 AND lot_id = (SELECT id FROM lots WHERE number = 8)"
# 2. Valor do comprovante (com o 1 desfeito): a auditoria do lote 8 acusa o comprovante, que aparece inválido. Desfazer: "+ 100000".
psql "UPDATE receipts SET amount = amount - 100000 WHERE lot_id = (SELECT id FROM lots WHERE number = 8)"
# 3. Último lance apagado: o lote 7 acusa lances removidos do fim. Sem desfazer.
psql "DELETE FROM bids WHERE seq = 4 AND lot_id = (SELECT id FROM lots WHERE number = 7)"
```

Para voltar ao estado do seed: `docker compose down -v`, `docker compose up --build` e o seed de novo.

## Rodar local

Tudo com Docker, num comando só (pré-requisito: Docker):

```bash
docker compose up --build
```

Front em http://localhost:5173, API em http://localhost:3000, banco na 5432.
Se alguma porta estiver ocupada: `WEB_PORT=5174 API_PORT=3001 DB_PORT=5433 docker compose up --build`.
As migrations rodam sozinhas no boot da API.

Dados de demonstração (com o compose de pé, em outro terminal):

```bash
docker compose exec api npm run seed
```

O seed cria tudo pelos services da aplicação, com as obras e imagens baixadas da Cleveland na hora, e pode ser rodado de novo: completa o que faltou sem duplicar nada. Se a Cleveland estiver fora no início, ele para antes de gravar; se falhar no meio, rodar de novo completa o que faltou.

Para desenvolver com hot reload (pré-requisito: Node 24), suba só o banco e rode API e front com npm:

```bash
docker compose up -d db

cd api && cp .env.example .env && npm ci && npm run start:dev   # ajuste DATABASE_URL se mudou DB_PORT
cd web && cp .env.example .env && npm ci && npm run dev         # outro terminal
```

Seed fora do compose (em `api/`): `DATABASE_URL` e `BID_HMAC_SECRET` têm que vir do ambiente do processo, não do `.env`, e o seed para com erro se faltar uma delas.

```bash
npm run build
DATABASE_URL=postgres://agora:agora@localhost:5432/agora BID_HMAC_SECRET=dev-only-bid-hmac-secret-change-me-0123 npm run seed
```

Em produção, o seed roda da máquina local contra a External Database URL do Render, com o `BID_HMAC_SECRET` copiado da API no Render (Environment). Com outro segredo, a API recusaria todo lance com `LOT_INTEGRITY_FAILED` e a auditoria acusaria todos os lotes:

```bash
DATABASE_URL='<External Database URL>' DB_SSL=true BID_HMAC_SECRET='<o mesmo do Render>' npm run seed
```

A API não sobe se faltar variável de ambiente, e a mensagem diz qual.
Os testes de integração (`npm run test:e2e`) sobem o próprio Postgres e também exigem Docker.

Migrations (em `api/`):

```bash
npm run migration:generate -- src/database/migrations/NomeDaMudanca   # a partir das entidades
npm run migration:create -- src/database/migrations/NomeDaMudanca     # vazia
npm run migration:run                                                 # aplica (o boot também aplica)
npm run migration:revert                                              # desfaz a última
```

## Arquitetura

_(módulos, fluxo de um lance e liquidação)_

**Fluxo de um lance** (`POST /lots/:id/bids`, só licitante): numa única transação, trava o lote (`FOR UPDATE`), lê a hora do servidor, busca o último lance da cadeia e trava as carteiras do licitante e do líder anterior em ordem de `id`. A regra decide (status, liderança, mínimo, saldo); recusa responde 422 com o código e o detalhe (`minimum`, `available`, `startsAt`) sem gravar nada. Aceito, o lance entra com o `seq` seguinte e o hash encadeado no anterior, o lote recebe o novo selo, lance atual, contagem e fim (prorrogado em 2 min quando faltam 2 min ou menos), e o comprometido sai do líder anterior para o novo lance. Liderança e mínimo vêm sempre do último lance em `bids`, nunca da cópia no lote (D-042).

**Tempo real:** depois do commit, o lance aceito vira um evento `bid` (`seq`, valor, alias, data e fim) no `GET /lots/:id/stream` (SSE, público), com heartbeat a cada 25 s. O histórico sai de `GET /lots/:id/bids?page=` (20 por página, do mais recente) e `GET /wallet` lista até 20 lotes em que o licitante é o líder e que ainda não foram liquidados.

## Auditoria

Qualquer pessoa confere se o histórico de um lote foi mexido, sem login, na tela `/lots/:id/audit` (veredito e cada lance com o seu código), aberta pelo campo da página inicial (aceita 7 ou VII) ou pelo link "Auditar este lote" na vitrine, na sala e no comprovante. Na API: `GET /lots/:id/audit` e `GET /lots/number/:number`, que leva do número ao id. A técnica é uma cadeia de HMAC (D-012):

- **Cada lance assina o anterior:** o lance guarda um HMAC do lote, da ordem, do licitante, do valor, da data e do hash do lance anterior. Mudar, inserir, apagar ou trocar a ordem de um lance quebra a cadeia, e só o servidor tem o segredo para assinar de novo.
- **O selo do lote** guarda a contagem e o último hash, e acusa lances apagados do fim, que deixariam o resto da cadeia coerente.
- **O comprovante assinado** aponta para o último lance da cadeia, e a assinatura dele é conferida a cada consulta (D-029).
- Um segredo só, com um prefixo diferente para cada uso, em formato fixo, para uma assinatura nunca valer em outro lugar (D-056).
- **Resultado:** `intact` (íntegro), `tampered` (lance adulterado, com o primeiro quebrado), `truncated` (lances apagados do fim) ou `receipt_tampered` (comprovante não confere), nessa prioridade (D-065). Cada lance aparece como íntegro, adulterado ou não verificável (depois do primeiro quebrado).
- **Limitação:** restaurar o lote e os lances inteiros para um estado anterior não é detectado, porque o hash não é guardado fora do banco.

## Comportamentos esperados

_(regras que podem surpreender, uma linha cada, com o porquê)_

- A sessão dura 8h e não renova: token vencido no recarregamento volta a visitante; um 401 durante o uso leva para Entrar com aviso de sessão expirada (D-006).
- O login aceita 5 tentativas por minuto por IP; a 6ª responde 429 (`TOO_MANY_ATTEMPTS`), contra força bruta de senha. Atrás da Cloudflare, o IP vem do `CF-Connecting-IP` (D-068).
- A busca no acervo mostra só pintura e escultura europeia ou arte grega e romana, um departamento por vez (tema da casa, D-050), e só peças com imagem.
- Uma peça só fica em um lote agendado ou ao vivo por vez; lote encerrado ou cancelado libera a peça para outro lote (D-051).
- Lote cancelado some da vitrine e do destaque, e o link direto dele responde 404 (lote não encontrado).
- Lote cujo selo não confere com a cadeia de lances para de aceitar lances (`LOT_INTEGRITY_FAILED`): sem isso, o próximo lance reassinaria o selo e apagaria a evidência de lances removidos (D-059).
- O leiloeiro só cancela lote próprio, agendado ou ao vivo e sem lances, como pede o enunciado: com lance responde `LOT_HAS_BIDS` e encerrado `LOT_ENDED`. Cancelar com lances exigiria estornar o saldo comprometido do líder, e o cancelamento com estorno é um opcional que não entrou (D-018). Lote de outro leiloeiro responde 404, sem revelar que existe.
- O número do lote só aparece depois da criação: a sequência é global, e outro leiloeiro pode pegar o número enquanto a ficha está aberta (D-053).
- O número do lote aparece em romano com o número comum ao lado ("Lote XIV · nº 14"); acima de 3999, onde o romano padrão acaba, aparece só o número comum (D-054).
- O destaque da página inicial é escolhido ao abrir a página e não troca de lote enquanto ela está aberta, mesmo que outro lote passe a ter o maior lance: a troca no meio da leitura tiraria a obra da frente do visitante. Os lances dele chegam ao vivo (é o único stream da página; os cards não atualizam), mas a virada de agendado para ao vivo, ou de ao vivo para encerrado, só aparece ao recarregar.
- Lote vencido é liquidado por um timer em memória, armado no boot para o próximo fim, e também no primeiro acesso a ele, porque a API do plano free dorme e o timer dorme junto. Débito do vencedor, crédito do leiloeiro e comprovante assinado numa transação só; timer e acessos simultâneos liquidam uma vez só (D-009).
- Lote cujo selo não confere com a cadeia de lances não é liquidado: nenhum saldo se move e a evidência fica para a auditoria. Cada acesso ao lote tenta liquidar de novo e registra o motivo no log, até alguém investigar (D-064).
- Se o crédito da venda levar o saldo do leiloeiro acima do teto do `integer` (~R$ 21 mi), o lote não é liquidado e o erro vai para o log: saldos são inteiros em centavos, sem `bigint`.
- Em Meus lances, lote encerrado fica em "Em andamento", marcado como aguardando liquidação, até o timer ou o primeiro acesso a ele liquidar: a listagem só lê, nunca liquida.
- A contagem regressiva de Meus lances usa o relógio do navegador, porque a listagem não traz a hora do servidor; a sala do lote continua sendo a referência exata.
- Consultar a auditoria não liquida o lote: lote vencido aparece encerrado e sem comprovante conferido até o timer ou o primeiro acesso à sala liquidá-lo.
- Lote vencido e ainda não liquidado continua comprometendo o saldo do vencedor, e a Carteira mostra "Você arrematou · aguardando liquidação"; a lista mostra até 20 lotes e diz quantos faltam (D-063).
- Na busca da vitrine, "7", "VII" e "lote vii" procuram o número do lote; romano em minúscula sem o "lote " vai como texto, porque o acervo tem nomes como "Agnolo di Cosimo". A busca abre a primeira aba com resultado (Ao vivo, Agendados, Encerrados), para o visitante não achar que nada existe só porque a aba atual está vazia.
- A sala do lote não calcula o status no navegador: quando a contagem chega ao início ou ao fim, ela busca o lote de novo (e repete até 3 vezes, a cada 2 s, se o status ainda não mudou), porque a hora de referência é a do servidor.
- O stream de lances vive na memória de uma instância só: com mais de uma réplica da API, cada uma veria só os lances que passaram por ela. Ele também não limita o número de conexões por lote. O stream só avisa; ao conectar e reconectar, a sala busca o lote e a primeira página do histórico de novo e une tudo pelo `seq`, sem duplicar lance.
- A sala mostra a primeira página do histórico (20 lances) mais os que chegam ao vivo, sem paginação; o mínimo exibido no formulário é só ajuda, quem decide é a API.
- Licitante não é identificado no stream nem no histórico: aparece por um alias diferente em cada lote, e `GET /lots/:id` com token de licitante devolve `me.alias` e `me.hasBid`, para a sala saber quais lances são dele e se ele já foi superado. Token inválido nessa rota responde 401, em vez de tratar como visitante.
- A sala encerrada mostra o resultado que o `GET /lots/:id` traz depois de liquidar; se o lote não pôde ser liquidado (selo que não confere), mostra "aguardando liquidação" sem tentar de novo sozinha, e recarregar a página tenta outra vez. O comprovante (`/receipts/:token`) é público e confere a assinatura a cada abertura.
- Os dados das obras (título, técnica, dimensões, descrição) aparecem como no acervo da Cleveland, em inglês, porque vêm só do acervo (D-038); só o tipo da obra é traduzido.

## Testes

```bash
cd api && npm test           # Jest, unitários ao lado de cada arquivo (*.spec.ts)
cd api && npm run test:e2e   # integração em api/test, contra Postgres real (exige Docker)
cd web && npm test           # Vitest
```

- **API:** regras de saldo e depósito, validação dos DTOs, hash de senha, cadastro e login, guards de token e de papel, filters de erro, `/health` e o logger que esconde parâmetros de query.
- **Catálogo:** mapeamento da peça da Cleveland (artista com fallback para `culture`, descarte de peça sem imagem), cache da busca com TTL, falha da Cleveland virando `CATALOG_UNAVAILABLE` sem entrar no cache e download da imagem (só JPEG, PNG ou WebP, até 5 MB contados nos bytes lidos).
- **Lotes:** datas de início e fim, peça já em lote ativo, limites de lance inicial e incremento, falha da imagem sem gravar lote, cadeia do destaque (maior lance, fim mais próximo, próximo agendado), filtros da vitrine e do painel, resumo do painel sem lotes e cancelamento (encerrado, com lance, lote alheio e trava da linha).
- **Lances:** ordem das recusas, mínimo, saldo, anti-sniping, cadeia de HMAC, selo e alias; no serviço, ordem dos locks, hora lida depois do lock, encadeamento do `seq` e do hash, atualização do lote, movimento do comprometido, resposta do lance, recusa quando o selo do lote não confere e evento emitido só depois da transação; stream por lote com heartbeat e campos fechados do evento e do histórico.
- **Integração (e2e):** Postgres 17 de verdade via Testcontainers e a API inteira por HTTP, com relógio de teste e catálogo falso. Lance aceito, recusado, de leiloeiro e sem token, saldo devolvido ao superado e prorrogação nos últimos 2 min; evento no stream só do lance aceito e ouvinte removido ao fechar a conexão, histórico paginado, `me` no detalhe por papel e lotes comprometidos na carteira; 10 lances simultâneos parados no mesmo lock (cadeia, selo, `seq`, lote e carteiras íntegros) dois lances do mesmo mínimo e o mesmo licitante em dois lotes com saldo para um lance só; destaque, cancelamento, contagens e ordem das abas da vitrine.
- **Auditoria:** verificação da cadeia, do selo e do comprovante (alteração, inserção, remoção, ordem trocada, selo nulo, comprovante divergente, ausente ou fora de lugar) e indicador por lance; no e2e, `UPDATE` no valor e no dono, `DELETE` do último lance e `UPDATE` no comprovante, aliases iguais aos da sala e duas queries por chamada.
- **Seed:** contas e lotes por status, auditoria íntegra em todos menos o adulterado (que aponta o lance alterado), comprovantes válidos, segunda execução sem duplicar, execução interrompida completada na seguinte, Cleveland fora sem gravar nada e segredo ausente barrado antes de subir a aplicação.
- **Front:** leitura do `exp` do token, tradução dos erros da API, valor e formatação de moeda, validação do depósito, rótulos e nota do resumo da sala do lote, id inválido na rota da sala, nova busca na virada de estado, tradução do tipo da obra e, na sala, união dos lances do POST, do stream e da reconexão pelo `seq`, situação do licitante, atalhos de valor e tradução das recusas de lance; na Carteira, os textos dos lotes comprometidos; o resultado da sala encerrada, a data por extenso e o hash abreviado do comprovante; em Meus lances, situação, tempo, ação e valor final de cada lote; no painel, o resultado do lote encerrado.

## Stack e decisões

NestJS 11, TypeORM e PostgreSQL na API; React 19, Vite e React Router 7 no front; deploy no Render.

- JWT no header `Authorization`, com validade de 8h e sem refresh token (D-006).
- Dados da obra só do acervo da Cleveland, com a imagem guardada no banco ao criar o lote (D-004, D-038).
- Cada lance roda numa transação única, com lock de linha no lote e nas carteiras (D-014).
- A auditoria usa uma cadeia de HMAC sobre os lances, mais um selo no lote (D-012).
- A liquidação acontece por timer em memória e também no acesso ao lote vencido, sem job periódico (D-009).

Todas as decisões e alternativas descartadas em [`docs/decisions.md`](docs/decisions.md).

## Fora do escopo

_(o que não foi feito, uma linha cada)_

- A carteira não tem extrato de movimentações: mostra só saldo, comprometido e disponível.
- O depósito é simulado, sem meio de pagamento (Pix, cartão).

## Uso de IA

O Claude Code implementou o código e fez os commits seguindo as regras do [`CLAUDE.md`](CLAUDE.md); o Claude (app) serviu de apoio de pesquisa.
As decisões foram minhas e estão registradas por story em [`docs/ai-log.md`](docs/ai-log.md).
