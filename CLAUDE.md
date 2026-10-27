# CLAUDE.md

## Contexto

Casa de leilões online de arte clássica europeia, desafio técnico Elite Dev (Verzel), prazo de 7 dias.
Itens vêm da API pública do Cleveland Museum of Art. Leiloeiro cria lotes, licitantes dão lances ao vivo, qualquer pessoa audita o histórico.

Nome do projeto: **Ágora**. Com acento em tudo que o usuário lê (interface, `<title>`, README); sem acento em identificadores técnicos (`agora`).

- Monorepo: `/api` (NestJS + TypeScript), `/web` (React), `docker-compose.yml` na raiz
- `docker compose up` sobe o projeto inteiro (banco, API e web). Os Dockerfiles servem só ao compose; o Render roda Node direto
- npm, com um `package.json` e um lockfile independentes em `api/` e em `web/` (sem workspaces)
- Banco: PostgreSQL
- ORM: TypeORM (`@nestjs/typeorm`)
- Auth: JWT no header `Authorization: Bearer`, expiração de 8h, sem refresh token (trade-off explicado no README)
- Deploy: tudo no Render free: API (Web Service), front (Static Site) e banco (Postgres). Cada serviço aponta o Root Directory para a sua pasta
- Tarefas organizadas com BMAD: trabalhe sempre dentro do escopo da story atual.

## Idioma

- Código (classes, funções, variáveis, rotas, colunas, mensagens de erro técnicas): **inglês**
- Commits, PRs, README, docs e comentários: **português (pt-BR)**
- Textos exibidos ao usuário final: português

## Nomenclatura

- Nomes curtos e diretos. Se um nome precisa de mais de 3 palavras, o design provavelmente está errado.
- Não repetir o contexto: `BidsService.place()`, não `BidsService.placeBidForLot()`.
- Arquivos no padrão Nest: `bids.service.ts`, `place-bid.dto.ts`.
- Sem abreviações além de `id`, `dto`, `db`.

## Estrutura de diretórios

```
/
├── api/
│   ├── src/
│   │   ├── main.ts, app.module.ts
│   │   ├── config/            # validação das envs
│   │   ├── common/            # Clock, erros de domínio, exception filter, guards
│   │   ├── database/          # data-source.ts (CLI) e migrations/
│   │   ├── health/
│   │   ├── auth/  users/  wallets/  catalog/
│   │   ├── lots/              # inclui o stream SSE (lot-events.service.ts)
│   │   ├── bids/  settlement/  audit/  receipts/
│   │   └── seed/              # roda com o contexto do Nest, usando os services
│   ├── test/                  # integração (Testcontainers)
│   └── package.json
├── web/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── app/               # rotas, layout, providers
│   │   ├── features/          # auth, lots, live-room, auctioneer, wallet, my-bids, receipts, audit
│   │   └── shared/            # api/ (client tipado), ui/ (componentes genéricos), lib/ (moeda, data)
│   └── package.json
├── docs/                      # decisions.md, ai-log.md, deploy-notes.md, stories/
├── .github/workflows/
├── docker-compose.yml
├── CLAUDE.md
└── README.md
```

Dentro de um módulo do Nest (exemplo `bids/`):

```
bids.module.ts
bids.controller.ts
bids.service.ts        # transação, lock, orquestração
bid.rules.ts           # regra pura, sem TypeORM (é aqui que o TDD acontece)
bid.rules.spec.ts
bid.entity.ts
dto/place-bid.dto.ts
```

- Front: uma pasta de feature por tela do enunciado. `shared/` só recebe o que duas ou mais features usam.
- Pasta nova fora dessa estrutura só com aviso antes.

## Arquitetura (`/api`)

- Um módulo por domínio: `auth`, `users`, `wallets`, `catalog`, `lots`, `bids`, `settlement`, `audit`, `receipts`.
- Controller fino: valida entrada (DTO + `class-validator`) e delega. Regra de negócio só no service.
- Erros de negócio são exceções de domínio com código estável, mapeadas por um exception filter:
  `BID_BELOW_MINIMUM`, `INSUFFICIENT_BALANCE`, `ALREADY_WINNING`, `LOT_NOT_STARTED`, `LOT_ENDED`, `ROLE_NOT_ALLOWED`,
  `EMAIL_TAKEN`, `INVALID_CREDENTIALS` (o mesmo para e-mail inexistente e senha errada).
  `CATALOG_UNAVAILABLE` (503), `IMAGE_DOWNLOAD_FAILED` (502), `LOT_HAS_BIDS` (409),
  `ARTWORK_ALREADY_LISTED` (409): peça já em lote agendado ou ao vivo.
  `BALANCE_LIMIT_EXCEEDED` (422): depósito que levaria o saldo acima do teto do `integer`.
  O front traduz o código; o backend não devolve texto livre para essas recusas.
- Erro de validação de DTO no formato `{ code: 'VALIDATION_FAILED', fields: { <campo>: <regra> } }`, para o front traduzir por campo.
- Configuração só via variáveis de ambiente validadas na inicialização. Todo novo env vai para o `.env.example`.
- Papel (`AUCTIONEER` ou `BIDDER`) escolhido no cadastro e fixo depois. Leiloeiro não dá lance; licitante não cria lote.
- Lote não é editável depois de criado. "Gerenciar" é: criar, cancelar sem lances e ver o resultado.
  Leiloeiro só vê e cancela os próprios lotes.
- Lance em lote cancelado ou inexistente devolve 404, sem código de domínio próprio.

## Dinheiro e tempo

- Dinheiro sempre em **centavos, inteiro**. Nunca `float`. Formatação de moeda só no front.
- Datas em UTC (`timestamptz`). A hora de referência das regras é a do servidor, nunca a do cliente.
- Acesso à hora atual via um `Clock` injetável, para os testes controlarem o tempo.
- Anti-sniping: lance aceito faltando 2 min ou menos para o fim soma 2 min ao fim atual (`ends_at += 2 min`), como faz o Catawiki.
  A prorrogação acontece na mesma transação do lance, e o novo `endsAt` vai no evento do SSE.

## Banco de dados

- **Proibido N+1**: nenhuma query dentro de loop. Relações carregadas com join/include explícito.
  Em dev, deixar o log de queries ligado e conferir quantas queries cada endpoint dispara.
- Toda listagem é paginada e seleciona só as colunas que a tela usa.
  Exceção: os lotes comprometidos em `GET /wallet` vêm com teto de 20 e o total, sem página (D-063).
- Índice em toda coluna usada em filtro ou ordenação frequente (ex.: `lots.starts_at`, `lots.ends_at`, `bids.lot_id`).
- Operações que mexem em saldo ou lance rodam numa **única transação**, com lock de linha (`FOR UPDATE`) no lote e nas carteiras.
  Carteiras sempre travadas na mesma ordem (por `id`) para evitar deadlock.
- O banco é a última defesa: `CHECK` em saldos (`balance >= committed >= 0`), `UNIQUE (lot_id, seq)` em lances,
  `UNIQUE (lot_id)` em comprovantes (um lote nunca é liquidado duas vezes, mesmo com timer e acesso disparando juntos).
- Tabela de lances é **append-only**: nunca `UPDATE` ou `DELETE` em `bids`.
- Schema só muda por migration versionada. Nunca `synchronize: true`. Nunca editar migration já aplicada; criar uma nova.
- Status do lote (agendado, ao vivo, encerrado) é **calculado** por `starts_at`/`ends_at` na query, nunca atualizado por job.
  Só vira coluna o que é evento: `cancelled_at`, `settled_at`.
- Cancelamento de lote também trava a linha do lote (`FOR UPDATE`), para não correr com um lance chegando.
- Valores em `integer` têm teto (~R$ 21 mi em centavos): depósito e lance validam um valor máximo. Não usar `bigint` (o driver devolve string).

## TypeORM

- `synchronize: false` sempre. Migrations geradas pelo CLI (`migration:generate`) e revisadas antes de commitar.
- Proibido `eager: true` e relações lazy (`Promise<...>`). Relações só carregam com `relations` explícito na query.
- Dentro de `dataSource.transaction(async (manager) => ...)`, usar **só** o `manager` (`manager.getRepository(...)`).
  Repository injetado no construtor roda fora da transação.
- Lock de linha: `lock: { mode: 'pessimistic_write' }` no `findOne` dentro da transação.
- `CHECK` declarado com `@Check` na entidade, para ir junto na migration.
- Nada de coluna `numeric` para valores: o driver devolve string. Dinheiro é `integer` em centavos.
- `select` parcial devolve o tipo da entidade inteira: não acessar campo que não foi selecionado.
- Campos de entidade com `!` (por causa do `strictPropertyInitialization`).

## Deploy

- A API no plano free do Render dorme após 15 min sem tráfego. Nenhuma regra pode depender só de job agendado:
  a liquidação também acontece quando alguém acessa um lote vencido.
- O cold start (até ~1 min no primeiro acesso) é aceito e avisado no README. Sem pinger externo.
- `GET /health` não toca no banco: serve só para dizer que a API está de pé.
- Liquidação agendada usa um timer em memória apontando para o próximo `ends_at`, recalculado no boot e a cada lance ou prorrogação.
  Sem cron e sem `@nestjs/schedule`.
- Postgres do Render no free **expira 30 dias após a criação**. No dia da entrega o banco é recriado e o seed roda de novo
  (passo a passo em `docs/deploy-notes.md`). Nada no código pode depender de dados criados antes disso.
- A API usa a URL **interna** do banco (mesma região, sem SSL). Da máquina local, só a URL externa, com SSL.
- Front e API em domínios diferentes: CORS liberado só para a origem do front, configurada por env.
- Front estático com rewrite `/* → /index.html`, senão links diretos (ex.: comprovante compartilhado) dão 404.

## Tempo real (SSE)

- `GET /lots/:id/stream` com `@Sse`, **público e sem guard**. Um stream por lote, mesmo evento para todos.
- Evento só é emitido **depois do commit** da transação, nunca dentro dela.
- Payload só com dado público: `seq`, valor, alias do licitante, `createdAt`, `endsAt` (D-062). Nunca `user_id`, nome ou e-mail.
- Alias por lote, determinístico: HMAC de `user_id` + `lot_id`. O mesmo licitante tem aliases diferentes em lotes diferentes.
- `GET /lots/:id` autenticado devolve `me.alias`. O front deriva "ganhando/superado" e a posição comparando com o alias do evento.
  Quando o status muda, o front busca `GET /wallet` de novo para atualizar o saldo.
- O stream é só notificação: ao conectar e ao reconectar, o front refaz o `GET` do lote para pegar o estado completo.
- `GET /lots/:id` devolve `serverTime`, para a contagem regressiva corrigir a diferença de relógio do cliente.
- Heartbeat (comentário SSE) a cada ~25s, para proxies não derrubarem a conexão parada.
- Eventos em memória, numa instância só. Limitação documentada no README.

## API externa (Cleveland)

- Todo acesso passa pelo módulo `catalog`. Nenhum outro módulo chama a API diretamente.
- Toda chamada com timeout (5s), `limit` e `fields` explícitos.
- Buscas em cache. Ao criar um lote, os dados da peça viram snapshot no banco: vitrine, sala, auditoria e comprovante nunca dependem da API.
- A imagem também entra no snapshot: baixada na criação do lote e guardada como `bytea` numa tabela própria (`lot_images`),
  fora da tabela `lots` para listagens nunca carregarem os bytes. Servida por `GET /lots/:id/image` com `Cache-Control` longo.
  Se o download falhar, o lote não é criado. Validar `content-type` de imagem e tamanho máximo.
- Nenhuma tela de lote usa URL do CDN da Cleveland. Só a busca do painel do leiloeiro mostra imagens direto de lá.
- `creators` costuma vir vazio em peças antigas: usar `culture` como fallback.
- Dados da obra vêm só do acervo: o leiloeiro não edita título nem adiciona texto livre ao lote.

## Segurança e privacidade

- Auditoria e comprovante identificam licitantes só por alias. Nunca expor nome ou e-mail.
- Segredo do HMAC da cadeia de lances só em variável de ambiente.
- O HMAC de cada lance cobre `lot_id`, `seq`, `user_id`, valor, data e o hash anterior. Sem o `user_id`, dá para trocar o vencedor sem quebrar a cadeia.
- O lote guarda um selo (HMAC de contagem + hash do último lance) para detectar remoção do final da cadeia.
  Limitação a documentar: restaurar lote e lances inteiros para um estado anterior não é detectado sem ancorar o hash fora do banco.
- Token do link de comprovante é aleatório e não sequencial.
- Comprovante assinado: guarda um HMAC de `lot_id`, alias do vencedor, valor, hash final da cadeia e data da liquidação.
  A assinatura é verificada toda vez que o comprovante é exibido, e a página mostra se ele é válido.
- Um segredo só (`BID_HMAC_SECRET`), com prefixo de domínio no conteúdo assinado (`bid:`, `seal:`, `alias:`, `receipt:`),
  para uma assinatura nunca valer em outro contexto.
- Nunca logar senha, token ou dado pessoal.

## Testes

- Jest. Regras de lance, saldo comprometido, anti-sniping e liquidação com testes unitários.
- Padrão do Nest: unitário em `*.spec.ts` **ao lado** do arquivo testado; integração em `api/test/*.e2e-spec.ts`,
  com a config `test/jest-e2e.json` e o script `npm run test:e2e`.
- Testes de integração contra Postgres real via **Testcontainers** (inclui lances simultâneos no mesmo lote).
- Todo bug corrigido ganha um teste que falhava antes da correção.

TDD (teste antes do código) **só** para: regras de lance, saldo comprometido, anti-sniping, liquidação e cadeia de HMAC.
CRUD, controllers, DTOs, mapeamento da Cleveland e front: teste depois, quando fizer sentido.

- Os casos de teste da story vêm definidos por mim. O agente transforma em teste e implementa; não inventa casos extras sem avisar.
- Regra de negócio fica em função ou classe pura (recebe estado, devolve decisão), separada do TypeORM.
  O teste unitário dela não usa mock de repository.
- Durante o ciclo, rodar só o spec afetado (`npx jest <arquivo>.spec.ts --silent`). Suíte inteira só antes de commitar.
- O teste de lances simultâneos (Testcontainers) não é TDD: escrito depois que o motor de lances existir.

Nomes de teste:
- `describe` com o nome da classe e do método (`describe('BidsService.place')`).
- `it` como frase curta em português descrevendo o comportamento, no papel do `@DisplayName` do Spring:
  `it('recusa lance abaixo do incremento')`, não `it('should throw BidBelowMinimumException when amount is lower than current plus increment')`.
- Uma regra por `it`. Se a frase precisa de "e", são dois testes.
- Dados de teste montados por factories curtas (`makeLot()`, `makeWallet()`), com override só do campo que importa no caso.

## Seed

- Leiloeiro, dois licitantes e ao menos um lote ao vivo com lances, também no ambiente de deploy. Credenciais no README.
- Lances do seed passam pelos services (nunca `INSERT` direto), senão a cadeia de HMAC fica inválida e a auditoria acusa adulteração.
- O lote ao vivo do seed termina em ~30 dias, para continuar aberto quando a avaliação acontecer.
- Lotes do seed criados pelo mesmo fluxo do leiloeiro, incluindo o download da imagem. Nenhuma imagem versionada no repositório.
  Se a Cleveland estiver fora na hora do seed, ele falha e é rodado de novo.

## Front (`/web`)

- Organização por feature (`features/lots`, `features/live-room`, `features/wallet`...), não por tipo de arquivo.
- Um client de API tipado, único. Componentes não chamam `fetch` diretamente.
- Tipos das respostas declarados à mão em `web/src/shared/api/types.ts`. Mudança de contrato na API atualiza esse arquivo na mesma PR.
- No back, respostas da API são **classes** em arquivos `*.dto.ts` (ex.: `lot-response.dto.ts`), nunca `type`/`interface`.
  Assim o plugin do `@nestjs/swagger` consegue gerar a documentação depois, sem decorar campo por campo.
- Regra de negócio fica no backend; o front só exibe estado e traduz códigos de erro.
- Toda tela que busca dados trata os três estados: **carregando**, **vazio** e **erro** (com ação para tentar de novo quando fizer sentido).
- Layout responsivo: nenhuma tela quebra ou gera rolagem horizontal a partir de 360px de largura.
- Selos, badges e botões têm a largura do próprio conteúdo (`justify-self: start` ou `width: fit-content`) dentro de grids e listas.
  Largura total só abaixo de 480px, quando o design pedir.

## Lint

- ESLint com a config padrão gerada pelo Nest CLI, mais `complexity: ['error', 10]` e `@typescript-eslint/no-explicit-any: 'error'`.
  No front, a config do template do Vite com as mesmas duas regras. Prettier para formatação.
- Tipo desconhecido usa `unknown` com checagem, nunca `any`. `as` só quando o tipo foi garantido antes (ex.: depois de validar).
- Função que estoura a complexidade é quebrada em funções menores, nunca silenciada com `eslint-disable`.

## Comentários

- Padrão é **nenhum comentário**. Nome claro e função pequena explicam o código.
- Comentário só para o **porquê** que o código não mostra: regra do enunciado, trade-off, armadilha conhecida.
  No máximo 2 linhas. Ex.: `// carteiras travadas em ordem de id para evitar deadlock`.
- Quando o motivo for longo, aponte a decisão em vez de explicar: `// ver D-012`.
- Proibido:
  - comentário que repete o código (`// incrementa o contador`, `// retorna o usuário`);
  - JSDoc em todo método, banners de seção (`// ===== SERVICES =====`), "Passo 1:", "Aqui vamos...";
  - código comentado (o Git guarda o histórico);
  - TODO sem referência a uma story.
- Testes não têm comentários: o texto do `it` é a documentação.

## README

O README é a porta de entrada do avaliador, não a documentação inteira. O detalhe mora em `docs/`; o README resume e linka.

- **Limite: 300 linhas.** O CI falha se passar. Alvo: ~200 a 250.
- Filtro para cada linha: "o avaliador precisa disso para **rodar**, **testar** ou **entender** o sistema?" Se não, vai para `docs/`.
- Atualizado na mesma PR da story. Ao acrescentar algo, condensar o que já existe em vez de só empilhar.
- Seções fixas, nesta ordem, com orçamento aproximado:

| Seção | Conteúdo | Linhas |
|---|---|---|
| Ágora | o que é, o que faz (lista curta de funcionalidades) + links do app e da API | 15 |
| Testar agora | credenciais do seed, aviso de cold start, roteiro curto de teste | 20 |
| Rodar local | pré-requisitos e comandos: banco (compose), migrations, seed, api, web | 40 |
| Arquitetura | visão geral dos módulos, fluxo de um lance (transação, lock, SSE), liquidação | 35 |
| Auditoria | como a técnica detecta alteração, remoção e inserção (o enunciado exige explicar) | 30 |
| Comportamentos esperados | regras que podem surpreender, uma linha cada, com o porquê | 30 |
| Testes | como rodar e o que cada suíte cobre | 15 |
| Stack e decisões | stack + as 5 decisões principais em uma linha cada + link para `docs/decisions.md` | 15 |
| Fora do escopo | o que não foi feito, uma linha cada, de forma objetiva | 15 |
| Uso de IA | resumo curto + link para `docs/ai-log.md` | 10 |

Proibido no README:
- Lista de todas as decisões (fica no `decisions.md`; o README traz só as 5 principais).
- Histórico do desenvolvimento, "melhorias futuras", autocrítica ou tom de desculpa. O que ficou de fora é declarado
  em "Fora do escopo" como fato ("cancelamento com estorno não foi implementado"), sem justificativa longa.
  Limitação entra como comportamento + motivo: "o primeiro acesso pode levar até 1 min (plano free do Render)".
- Texto repetido de `docs/`, explicação de código, tutorial de ferramenta.

## Decisões (`docs/decisions.md`)

- Toda decisão com alternativa real vira uma entrada: escolha de lib, leitura de regra ambígua do enunciado, trade-off de arquitetura.
- O agente propõe as opções com trade-off; **só registra depois que eu decidir**.
- Seguir o modelo do topo do arquivo. Numeração sequencial `D-NNN`.
- Entrada antiga não é editada. Se a decisão mudar, nova entrada com "Substitui D-NNN", e a antiga recebe "Substituída por D-NNN".
- A entrada vai na mesma PR da story que implementa a decisão. O detalhe fica só no `decisions.md`; o README só resume e linka.

## Git

- Uma branch por story: `story/<epic>-<story>-<slug>` (ex.: `story/2-3-place-bid`). Nunca commitar direto na `main`.
- Uma PR por story, com: o que mudou, como testar, checklist dos critérios de aceite da story.
- Merge sempre por **squash**: o título da PR vira o commit na `main`, então segue o mesmo formato dos commits.
- Depois do merge, a branch da story nunca é apagada, nem local nem no GitHub.
- GitHub Actions roda lint, testes e build e valida o título da PR. PR só entra na `main` com o CI verde.

## Commits (feitos pelo agente)

Formato Conventional Commits, mensagem em português:

```
<tipo>(<escopo>): <descrição>

<corpo opcional: por que a mudança foi feita, quando não for óbvio>

Refs: story <epic>.<story>
```

- **Tipos**: `feat` (funcionalidade), `fix` (correção), `refactor` (sem mudar comportamento), `test` (só testes),
  `docs` (só documentação), `chore` (dependências, config), `ci` (pipelines), `perf` (desempenho).
- **Escopos**: o módulo afetado: `auth`, `users`, `wallets`, `catalog`, `lots`, `bids`, `settlement`, `audit`,
  `receipts`, `web`, `db`, `infra`. Se a mudança cobre mais de um módulo, provavelmente devia ser mais de um commit.
- **Descrição**: imperativo no presente ("adiciona", "valida", "corrige"), minúscula, sem ponto final, até 72 caracteres.
  Diz o que muda, não como: `feat(bids): recusa lance abaixo do incremento mínimo`, não `feat(bids): altera if no service`.
- **Corpo**: só quando o motivo não é óbvio pelo título. Explica o porquê, não repete o diff.
- **Rodapé**: sempre `Refs: story X.Y`. Manter o trailer de coautoria do Claude Code (transparência sobre uso de IA).
  A mensagem do squash na `main` também leva o trailer (a partir da 4.1).

Atomicidade:
- Um commit = uma mudança lógica que compila e passa nos testes sozinha.
  Exceção: nas stories em TDD, o commit `test` vem vermelho antes do `feat` (ver D-055).
- Teste vai no mesmo commit da funcionalidade que ele cobre. Migration vai no mesmo commit da entidade.
- Nunca misturar `refactor` com `feat` ou `fix` no mesmo commit.
- Adicionar arquivos explicitamente (nunca `git add .` às cegas) e revisar `git diff --staged` antes de commitar.
- Nunca commitar `.env`, segredos, arquivos gerados ou `node_modules`.

Exemplos:
```
feat(wallets): adiciona depósito simulado
fix(settlement): evita liquidar o mesmo lote duas vezes
test(bids): cobre lances simultâneos no mesmo lote
refactor(catalog): extrai mapeamento da resposta da Cleveland
```
Ruins: `update`, `ajustes`, `wip`, `fix: vários bugs`, `feat: cria lances, carteira e auth`.

## Uso de IA

- Ao concluir cada story, adicionar uma entrada em `docs/ai-log.md`:
  story, o que a IA gerou, o que revisei e pedi para mudar, sugestões da IA que foram rejeitadas e por quê.
- Na entrada, "O que revisei e pedi para mudar" lista tudo o que eu decidi ou pedi durante a story, tirado da conversa:
  casos de teste que pedi, perguntas que respondi, valores que defini, pedidos de correção e o motivo de cada um.
  Uma linha por item. Nunca inventar revisão que não aconteceu.
- Cada seção da entrada tem no máximo 8 itens, só com decisões (perguntas e autorizações operacionais não entram).
  Ajustes visuais da mesma tela viram um item só.
- Nessa seção, só verbos do que eu fiz: decidi, escolhi, aprovei, recusei, pedi. Nunca "reescrevi", "acrescentei",
  "corrigi" ou "implementei": eu não escrevo código à mão, eu peço e o agente faz ("Pedi um caso de teste a mais").
- "Sugestões rejeitadas" inclui tudo o que eu recusei ou mudei de uma proposta do agente.
- Entradas novas em frases curtas, em português corrente, com detalhe técnico só quando for indispensável.
- A seção "Resumo" do topo é para quem não é técnico: linguagem simples, no máximo 30 linhas, sem nomes de arquivo, códigos de erro ou siglas.
- O agente faz os commits seguindo a seção Commits. Push e abertura de PR só com pedido explícito.

## Comportamento esperado do agente

- Ficar no escopo da story. Se algo fora dela parecer necessário, avisar em vez de implementar.
- Perguntar antes de adicionar dependência nova.
- Diffs pequenos. Antes de dizer que terminou: lint, testes e build passando.
- Antes de commitar, rodar `npm run lint:check` (o mesmo do CI), não `npm run lint`, que corrige sozinho e esconde erro de formatação.
- Ao propor uma solução com trade-off relevante, explicar a alternativa em uma ou duas frases.
- Revisão: só o revisor de casos de borda. Os três revisores só nas stories 4.1, 4.2, 4.3, 4.4, 5.1, 5.2 e 5.5.
- Correções da revisão: corrige sozinho só os achados graves (bug, segurança, regra de negócio). Os de estilo ou opcionais, lista em uma linha cada e não corrige.
- Contexto do épico: compila uma vez por épico, salva em arquivo e reaproveita nas stories seguintes.
- Do `epics.md`, lê só a seção da story atual.
- No ai-log, "O que revisei e pedi para mudar" lista o que eu decidi ou pedi na conversa, sem inventar.

## Definition of Done (por story)

- [ ] Critérios de aceite da story atendidos
- [ ] Testes novos cobrindo a regra principal
- [ ] Sem N+1 nos endpoints tocados
- [ ] `.env.example` e README atualizados se algo mudou
- [ ] Entrada em `docs/ai-log.md`
- [ ] Decisões novas registradas em `docs/decisions.md`
- [ ] Comentários revisados: só "porquê", nenhum que repete o código
- [ ] Stories de tela: conferido em 360, 768, 1024 e 1280px, sem elemento esticado, vazando ou sobreposto.
  Como o agente não abre o navegador, o relatório final lista essas quatro larguras para eu conferir
- [ ] PR aberta com descrição e checklist
