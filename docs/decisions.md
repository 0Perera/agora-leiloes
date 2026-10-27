# Decisões

Registro das decisões do projeto que tinham alternativa real. Cada entrada diz o que foi escolhido, por quê e o que foi descartado.

Entradas antigas não são editadas. Se uma decisão mudar, cria-se uma nova entrada com "Substitui D-NNN", e a antiga recebe o status "Substituída por D-NNN".

D-001 a D-030 foram tomadas no planejamento (22 e 23/10/2026), antes da primeira linha de código.

## Modelo

```
## D-NNN: título curto

Status: Aceita | Substituída por D-NNN
Data: AAAA-MM-DD
Story: X.Y (ou "planejamento")

**Decisão:** o que foi escolhido, em uma ou duas frases.
**Por quê:** o motivo concreto.
**Alternativas descartadas:** opção e motivo, uma por linha.
**Consequência:** o que isso obriga ou limita daqui para frente.
```

---

## D-001: NestJS + TypeScript no back-end

Status: Aceita · Story: planejamento

**Decisão:** API em NestJS com TypeScript.
**Por quê:** estrutura de módulos, injeção de dependência e validação por DTO prontas; organização parecida com Spring, que já conheço.
**Alternativas descartadas:** Express puro (estrutura toda manual); FastAPI/Django (o desafio permite, mas a escolha foi focar no ecossistema Node).
**Consequência:** um módulo por domínio, controller fino, regra no service.

## D-002: PostgreSQL com TypeORM

Status: Aceita · Story: planejamento

**Decisão:** PostgreSQL acessado via TypeORM (`@nestjs/typeorm`).
**Por quê:** integração nativa com o Nest, entidades como classes, lock pessimista (`pessimistic_write`) e `@Check` declarativos.
**Alternativas descartadas:** Prisma (lock de linha e `CHECK` exigiriam SQL manual na migration).
**Consequência:** `numeric` e `bigint` voltam como string, então dinheiro é `integer` em centavos. Proibido `synchronize`, `eager` e relação lazy.

## D-003: Itens da API do Cleveland Museum of Art

Status: Aceita · Story: planejamento

**Decisão:** tema arte clássica europeia, com itens da Open Access API do Cleveland Museum of Art.
**Por quê:** sem chave, dados completos já na busca (sem N+1), acervo em domínio público (CC0), respostas testadas abaixo de 1s.
**Alternativas descartadas:**
- pokemontcg.io: descontinuada, desligamento previsto para 1/3/2027.
- Scrydex: paga.
- YGOPRODeck: dados sujos e obrigação de hospedar as imagens.
- TCGdex: chamada extra por carta.
- Art Institute of Chicago: limite de 60 req/min e imagens via IIIF.
- Metropolitan Museum: busca devolve só IDs, uma chamada por objeto.
- Rebrickable: exige chave e é instável.
**Consequência:** `creators` costuma vir vazio em peças antigas, então `culture` é o fallback.

## D-004: Snapshot do item, incluindo a imagem

Status: Aceita · Story: planejamento

**Decisão:** ao criar o lote, os dados da peça e a imagem são copiados para o banco. A imagem fica em `bytea` na tabela `lot_images` e é servida por `GET /lots/:id/image`.
**Por quê:** o desafio exige que vitrine, sala, auditoria e comprovante funcionem com a API fora do ar. A API e o CDN de imagens da Cleveland são serviços separados; só guardar a URL ainda dependeria do CDN.
**Alternativas descartadas:** guardar só a URL com placeholder (continua dependente do CDN).
**Consequência:** se o download falhar, o lote não é criado. O seed também depende da Cleveland no momento em que roda.

## D-005: Tempo real com SSE e alias público

Status: Aceita · Story: planejamento

**Decisão:** `GET /lots/:id/stream` com `@Sse`, público. O evento traz o alias do licitante; o front compara com `me.alias` (vindo do `GET` autenticado) para mostrar "ganhando/superado".
**Por quê:** a comunicação é só servidor → cliente, e o histórico com alias já é público por exigência da auditoria. Nenhuma dependência nova.
**Alternativas descartadas:**
- Token na query string: o JWT iria para logs e histórico do navegador.
- `fetch-event-source`: dependência extra e stream por usuário.
- Socket.IO: resolve a autenticação no handshake, mas custa 3 dependências e de 1 a 2h a mais.
**Consequência:** o servidor nunca envia evento privado. Eventos em memória limitam a API a uma instância.

## D-006: JWT no header, validade de 8h, sem refresh

Status: Aceita · Story: planejamento

**Decisão:** JWT em `Authorization: Bearer`, expirando em 8h, sem refresh token.
**Por quê:** front e API ficam em domínios diferentes. Cookie viraria de terceiro (`SameSite=None`), que o Safari bloqueia. 8h evita que o avaliador seja deslogado no meio do teste.
**Alternativas descartadas:** cookie httpOnly (problema de domínio cruzado); 15 min sem refresh (desloga no meio da avaliação); 15 min com refresh (mais implementação).
**Consequência:** um token vazado vale até 8h. Trade-off documentado no README.

## D-007: Deploy em Render (API) + Neon (banco)

Status: Banco substituído por D-027 · Story: planejamento

**Decisão:** API no Render Web Service free, banco no Neon free, front estático no Render Static Site ou Vercel.
**Por quê:** os dois são gratuitos sem cartão. O Neon não expira.
**Alternativas descartadas:** Postgres free do Render (expira em 30 dias); Koyeb (passou a exigir cartão).
**Consequência:** a API dorme após 15 min sem tráfego; o Neon desliga após 5 min parado e tem cota de 100 CU-h por mês.

## D-008: Cold start aceito

Status: Aceita · Story: planejamento

**Decisão:** sem pinger externo; o primeiro acesso pode levar até ~1 min, e isso é avisado no README.
**Por quê:** zero trabalho extra.
**Alternativas descartadas:** UptimeRobot chamando `/health` a cada 5 min.
**Consequência:** `/health` não toca no banco.

## D-009: Liquidação sem job periódico

Status: Aceita · Story: planejamento

**Decisão:** a liquidação acontece por um timer em memória apontando para o próximo `ends_at` e também quando alguém acessa um lote vencido.
**Por quê:** a API dorme no Render, então um job agendado sozinho não basta. E um cron consultando o banco a cada minuto mantém o Neon ligado: no mínimo 0,25 CU × 744 h ≈ 186 CU-h, acima dos 100 do free.
**Alternativas descartadas:** cron a cada minuto.
**Consequência:** a liquidação precisa ser idempotente, porque timer e acesso podem disparar ao mesmo tempo.

## D-010: Status do lote calculado pelo horário

Status: Aceita · Story: planejamento

**Decisão:** agendado, ao vivo e encerrado são calculados a partir de `starts_at`/`ends_at` na query. Só eventos viram coluna: `cancelled_at`, `settled_at`.
**Por quê:** nenhum job precisa estar acordado para o status mudar.
**Alternativas descartadas:** coluna `status` atualizada por job.
**Consequência:** índices em `starts_at` e `ends_at`.

## D-011: Anti-sniping soma 2 min ao fim atual

Status: Aceita · Story: planejamento

**Decisão:** lance aceito faltando 2 min ou menos para o fim faz `ends_at += 2 min`.
**Por quê:** é a leitura literal do enunciado ("estende o fim do lote para +2 minutos") e é como o Catawiki, uma das referências do desafio, funciona.
**Alternativas descartadas:** `ends_at = agora + 2 min` (usado por algumas plataformas, como a MaxSold; um lance no início da janela estenderia o fim em poucos segundos).
**Consequência:** depois de um lance na janela, o tempo restante fica entre 2 e 4 min.

## D-012: Cadeia de HMAC contra adulteração

Status: Aceita · Story: planejamento

**Decisão:** cada lance guarda um HMAC de `lot_id`, `seq`, `user_id`, valor, data e o hash anterior. O lote guarda um selo com HMAC da contagem e do último hash. O segredo fica só em variável de ambiente.
**Por quê:** com hash simples (SHA-256), quem tem acesso ao banco recalcula a cadeia inteira. Com HMAC, recalcular exige o segredo. O `user_id` no HMAC impede trocar o dono de um lance; o selo detecta remoção do final.
**Alternativas descartadas:** SHA-256 sem segredo; assinatura assimétrica (mais complexa sem ganho para o escopo).
**Consequência:** a verificação é feita pelo servidor, não pelo visitante. Restaurar lote e lances inteiros para um estado anterior não é detectado sem ancorar o hash fora do banco (limitação no README).

## D-013: Alias por lote

Status: Aceita · Story: planejamento

**Decisão:** licitantes aparecem como alias derivado de HMAC de `user_id` + `lot_id`.
**Por quê:** o desafio exige auditoria e comprovante sem dado pessoal. Alias diferente por lote impede cruzar o comportamento de um licitante entre leilões.
**Alternativas descartadas:** alias fixo por usuário.
**Consequência:** o `GET` autenticado do lote precisa devolver `me.alias`.

## D-014: Lock pessimista e transação única nos lances

Status: Aceita · Story: planejamento

**Decisão:** lance, liquidação e cancelamento rodam numa transação, com `FOR UPDATE` no lote e nas carteiras, que são travadas sempre em ordem de `id`.
**Por quê:** lances simultâneos no mesmo lote não podem ler o mesmo "lance atual". A ordem fixa evita deadlock.
**Alternativas descartadas:** lock otimista com versão (retry no lance, pior sob disputa).
**Consequência:** teste de integração com lances simultâneos contra Postgres real.

## D-015: Dinheiro em centavos, `integer`

Status: Aceita · Story: planejamento

**Decisão:** valores em centavos, coluna `integer`, com teto validado no depósito e no lance.
**Por quê:** sem erro de arredondamento. `bigint` e `numeric` voltam como string no driver.
**Alternativas descartadas:** `numeric`, `bigint`, `float`.
**Consequência:** teto de ~R$ 21 milhões por valor.

## D-016: Papéis escolhidos no cadastro

Status: Aceita · Story: planejamento

**Decisão:** o usuário escolhe `AUCTIONEER` ou `BIDDER` no cadastro, e o papel não muda depois.
**Por quê:** o avaliador consegue testar os dois lados sem depender só do seed.
**Alternativas descartadas:** leiloeiro só via seed.
**Consequência:** nenhuma tela de troca de papel.

## D-017: Lote não editável

Status: Aceita · Story: planejamento

**Decisão:** o leiloeiro cria, cancela (sem lances) e vê o resultado. Não edita.
**Por quê:** editar lote com lances mexeria no que a auditoria registra, e o enunciado não pede edição.
**Alternativas descartadas:** editar lotes agendados.
**Consequência:** erro de digitação na criação se resolve cancelando e criando de novo.

## D-018: Opcionais escolhidos

Status: Aceita · Story: planejamento

**Decisão:** dos opcionais, entram busca e filtro de lotes, Docker Compose e testes automatizados.
**Por quê:** prazo de 7 dias com ~3h por dia. Busca e filtro são baratos com os dados do snapshot.
**Alternativas descartadas:** cancelamento com estorno (mexe no motor de lances e na auditoria); dark mode (exige segunda paleta para o tema de mármore).
**Consequência:** se o prazo apertar, caem primeiro os opcionais, depois o polimento visual.

## D-019: Testes com Jest, Testcontainers e TDD seletivo

Status: Aceita · Story: planejamento

**Decisão:** Jest; integração contra Postgres real via Testcontainers; TDD só para regras de lance, saldo comprometido, anti-sniping, liquidação e cadeia de HMAC.
**Por quê:** TDD em tudo consome tempo que o prazo não tem. Nessas regras, um bug aparece direto para o avaliador.
**Alternativas descartadas:** TDD em tudo; mocks de repository no lugar de banco real.
**Consequência:** regra de negócio fica em função pura, separada do TypeORM.

## D-020: Seed pelos services

Status: Aceita · Story: planejamento

**Decisão:** o seed cria usuários, lotes e lances pelos mesmos services da aplicação, incluindo o download da imagem. O lote ao vivo termina em ~30 dias.
**Por quê:** lance inserido por SQL não teria HMAC válido e a auditoria acusaria adulteração. O prazo longo mantém o lote aberto durante a avaliação.
**Alternativas descartadas:** `INSERT` direto; imagens versionadas no repositório.
**Consequência:** o seed falha se a Cleveland estiver fora do ar; basta rodar de novo.

## D-021: Squash merge e título de PR validado

Status: Aceita · Story: planejamento

**Decisão:** uma branch e uma PR por story, merge por squash, título no formato Conventional Commits validado no CI.
**Por quê:** a `main` fica com um commit por story, legível. Validar só o título dispensa commitlint e hooks locais.
**Alternativas descartadas:** commitlint em todos os commits; merge commit.
**Consequência:** os commits de dentro da branch seguem o CLAUDE.md, sem checagem automática.

## D-022: Lint padrão do Nest com limite de complexidade

Status: Parcialmente substituída por D-028 · Story: planejamento

**Decisão:** config de ESLint gerada pelo Nest CLI, mais `complexity: ['error', 10]`.
**Por quê:** barra função com muitos caminhos aninhados, um dos pontos do feedback do desafio anterior ("código mal construído").
**Alternativas descartadas:** regras extras (`no-explicit-any` como erro, `no-floating-promises`).
**Consequência:** função que estoura o limite é quebrada, nunca silenciada com `eslint-disable`.

## D-023: Tipos do front declarados à mão

Status: Aceita · Story: planejamento

**Decisão:** o front declara os tipos das respostas em `web/src/shared/api/types.ts`. No back, toda resposta é uma classe em `*.dto.ts`.
**Por quê:** a API tem umas 15 rotas e back e front mudam na mesma PR, então o risco de divergência é controlado. As respostas como classe deixam o Swagger pronto para ser ligado depois (documentação é desejada, mas não é prioridade).
**Alternativas descartadas:**
- Pacote compartilhado: exige workspaces, incompatível com D-025.
- Gerar tipos do Swagger desde já: duas dependências e um passo de regeneração antes de a documentação ser prioridade.
**Consequência:** renomear um campo no back não quebra a compilação do front; a PR precisa atualizar os dois lados. Adicionar o Swagger depois custa de 30 a 60 min.

## D-024: Testes no padrão do Nest

Status: Aceita · Story: planejamento

**Decisão:** teste unitário em `*.spec.ts` ao lado do arquivo testado; integração em `api/test/*.e2e-spec.ts` com config própria do Jest.
**Por quê:** é o padrão do framework e do Nest CLI. Ao lado do código, o import é `./bid.rules`, sem caminhos relativos longos.
**Alternativas descartadas:** árvore espelhada como no Spring (`src/` e `test/` paralelos), que em TypeScript exige alias de import e vai contra o que o avaliador espera de um projeto Nest.
**Consequência:** a suíte lenta (Testcontainers) roda separada, com `npm run test:e2e`.

## D-025: npm sem workspaces e front no Render

Status: Aceita · Story: planejamento · Complementa D-007

**Decisão:** npm, com `package.json` e lockfile independentes em `api/` e `web/`. O front vai para o Render Static Site, junto com a API.
**Por quê:** cada serviço no Render aponta o Root Directory para a sua pasta, sem comandos de workspace no build. Tudo numa plataforma só.
**Alternativas descartadas:** npm workspaces (um install só, mas build mais frágil no Render); pnpm; Vercel para o front.
**Consequência:** dois `npm ci` no CI, um por pasta. Nenhum código compartilhado entre `api` e `web`.

## D-026: Pastas por domínio, não por camada

Status: Aceita · Story: planejamento

**Decisão:** uma pasta por módulo de domínio (`bids/`, `lots/`, `wallets/`...), com controller, service, entidade, regras e DTOs dentro.
**Por quê:** é o padrão do Nest. A pasta coincide com o `@Module`, o `nest g resource` gera assim, e uma story mexe numa pasta só. Regras como "só o `catalog` chama a Cleveland" ficam fáceis de verificar.
**Alternativas descartadas:** pastas por camada (`controllers/`, `services/`, `entities/`), comum em projetos Spring: esconde as fronteiras dos módulos e espalha cada story por várias pastas.
**Consequência:** código usado por mais de um módulo vai para `common/`.

## D-027: Banco no Postgres do Render, recriado na entrega

Status: Aceita · Story: planejamento · Substitui a parte de banco da D-007

**Decisão:** o banco de produção é o Postgres free do Render, na mesma região da API. No dia da entrega, o banco é apagado, recriado e recebe o seed de novo.
**Por quê:** tudo numa plataforma só, conexão pela URL interna sem SSL, e somem as restrições do Neon (cota de CU-h e compute desligando após 5 min). O free do Render expira em 30 dias, mas o Elite Dev avalia em até 4 dias após a entrega e o processo inteiro dura de 20 a 30 dias. Recriado na entrega, o banco cobre o processo inteiro.
**Alternativas descartadas:** Neon (não expira, mas exige string direta com SSL, pool ajustado e cuidado com a cota de CU-h).
**Consequência:** o seed precisa ser confiável e repetível. Recriar o banco gera uma URL nova, que precisa ser atualizada na API. A proibição de cron perde o motivo da cota, mas a liquidação continua por timer em memória e no acesso, porque a API dorme.

## D-028: `any` proibido no lint

Status: Aceita · Story: planejamento · Substitui a parte da D-022 que descartava `no-explicit-any`

**Decisão:** `@typescript-eslint/no-explicit-any` como erro, na API e no front.
**Por quê:** a config padrão do Nest desliga essa regra, então um `any` deixado pela IA passaria pelo CI. Tipagem consistente pesa na avaliação de qualidade.
**Alternativas descartadas:** manter o padrão do Nest (o `any` só seria pego em revisão manual).
**Consequência:** tipo desconhecido usa `unknown` com checagem.

## D-029: Comprovante assinado com HMAC

Status: Aceita · Story: planejamento

**Decisão:** o comprovante guarda um HMAC de lote, alias do vencedor, valor, hash final da cadeia e data da liquidação, verificado a cada exibição. Um segredo só, com prefixo de domínio por uso (`bid:`, `seal:`, `alias:`, `receipt:`).
**Por quê:** o token aleatório impede adivinhar o link, mas não prova que o conteúdo não foi alterado no banco. A assinatura prova. Reaproveita a mesma lógica da cadeia de lances.
**Alternativas descartadas:** só token aleatório; segredo separado por uso (mais variáveis de ambiente sem ganho prático com o prefixo de domínio).
**Consequência:** a página do comprovante mostra se ele é válido.

## D-030: Docker Compose sobe o projeto inteiro

Status: Aceita · Momento de implementação substituído por D-035 · Story: planejamento

**Decisão:** `docker compose up` sobe banco, API e web. Dockerfiles em `api/` e `web/` servem só ao compose.
**Por quê:** quem avalia roda o projeto local com um comando, sem instalar Node.
**Alternativas descartadas:** compose só com o Postgres (exige Node instalado e três terminais).
**Consequência:** o Render continua rodando Node direto, sem Docker. O compose entra numa story própria, depois do esqueleto.

## D-031: Migrations rodam no boot da API

Status: Aceita
Data: 2026-10-23
Story: 1.1

**Decisão:** `migrationsRun: true` no TypeORM. A API aplica as migrations pendentes ao subir; o start command no Render é só `node dist/main`.
**Por quê:** o Render free não tem pre-deploy. Rodando no boot, `npm run start:dev` local, o deploy e o seed (que sobe o contexto do Nest) aplicam as migrations do mesmo jeito, com uma configuração só.
**Alternativas descartadas:** start command `npm run migration:run && node dist/main` (explícito no Render, mas o `start:dev` local não migraria sozinho e o CLI em produção dependeria do data-source compilado).
**Consequência:** migration com erro impede a API de subir. O log do boot mostra as migrations executadas.

## D-032: Nest CLI 11 no lugar do 12

Status: Aceita
Data: 2026-10-23
Story: 1.1

**Decisão:** API criada com `@nestjs/cli@11` e libs `@nestjs/*` na linha cujo `peerDependencies` aceita `@nestjs/common` 11 (`@nestjs/config@4`, `@nestjs/typeorm@11`), com `typeorm` 0.3.
**Por quê:** o template do Nest CLI 12 troca Jest por Vitest, ESLint por oxlint e CommonJS por ESM, contrariando D-019, D-022, D-024 e D-028. O Nest 11 gera exatamente o que essas decisões descrevem, e o CLI do TypeORM funciona sem atrito em CommonJS.
**Alternativas descartadas:** template do Nest 12 (exigiria substituir quatro decisões e adaptar o TypeORM ao ESM); Nest 12 com Jest e ESLint trocados à mão (mais trabalho e dependências fora da lista aprovada).
**Consequência:** ao instalar qualquer `@nestjs/*`, conferir que o `peerDependencies` aceita o Nest 11, porque o `latest` do npm aponta para a linha 12.

## D-033: oxlint no front, ESLint na API

Status: Aceita
Data: 2026-10-23
Story: 1.1

**Decisão:** o front usa o oxlint que o template `react-ts` do Vite já traz, com `complexity: ['error', 10]` e `typescript/no-explicit-any` como erro. A API continua com o ESLint do Nest CLI 11. Prettier nos dois, com a mesma config.
**Por quê:** cada projeto segue o padrão do próprio framework, sem dependência extra. O oxlint tem as duas regras exigidas pela D-022 e pela D-028.
**Alternativas descartadas:** trocar o oxlint por ESLint no front (dependências a mais só para uniformizar a ferramenta).
**Consequência:** as regras de lint ficam em dois formatos (`api/eslint.config.mjs` e `web/.oxlintrc.json`); regra nova precisa entrar nos dois.

## D-034: Deploy pelo Blueprint do Render

Status: Aceita
Data: 2026-10-23
Story: 1.1

**Decisão:** API, front e banco declarados num `render.yaml` na raiz (Blueprint), todos no plano free, na região `virginia`.
**Por quê:** a configuração do deploy fica versionada e revisável na PR, em vez de espalhada no dashboard. Virginia é a região do Render mais próxima do Brasil. A `DATABASE_URL` vem do banco por referência, o que simplifica recriar o banco na entrega (D-027).
**Alternativas descartadas:** configurar os três serviços à mão no dashboard (nada versionado, fácil esquecer o rewrite ou o health check).
**Consequência:** `WEB_ORIGIN` e `VITE_API_URL` usam `sync: false`: são pedidas só na criação e, depois disso, mudam só pelo dashboard. Mudança de build, start ou rota passa pelo `render.yaml`.

## D-035: Compose completo na story 1.1, com o front em nginx

Status: Aceita
Data: 2026-10-23
Story: 1.1 · Substitui a parte da D-030 que adiava o compose para uma story própria

**Decisão:** os Dockerfiles e o compose com banco, API e web entram já na story 1.1. O front no container é o build do Vite servido por nginx, com fallback para `index.html`.
**Por quê:** com o esqueleto pronto, o compose completo custava pouco e já deixa o projeto rodando com um comando. O nginx reproduz o Static Site do Render (arquivos estáticos e rewrite), sem dependência npm nova.
**Alternativas descartadas:** manter o compose para uma story própria (adiaria algo barato); Vite dev server no container (diferente de produção e com atrito de volume em `node_modules`).
**Consequência:** mudança de código exige `docker compose up --build`; para desenvolver com hot reload, sobe-se só o `db` e roda-se API e front com npm. `VITE_API_URL` é argumento de build da imagem do front.

## D-036: Número do lote sequencial, exibido em romano

Status: Substituída por D-054
Data: 2026-10-24
Story: planejamento

**Decisão:** cada lote recebe um número sequencial, global e único, exibido em algarismos romanos ("Lote VII"). A busca da auditoria aceita o número em arábico ou em romano ("7" ou "VII").
**Por quê:** dá ao lote um identificador curto, que o visitante consegue digitar para abrir a auditoria, e o romano combina com o tema de arte clássica.
**Alternativas descartadas:** expor o `id` interno (longo, sem significado para quem lê); número em arábico (funciona, mas perde a identidade visual do tema).
**Consequência:** o número é uma coluna própria com `UNIQUE`, gerada por sequência no banco, e não muda depois da criação. A conversão para romano e a leitura de "VII" ficam no front; a API trabalha com o número inteiro.

## D-037: Destaque da vitrine pelo maior lance ao vivo

Status: Aceita
Data: 2026-10-24
Story: planejamento

**Decisão:** o destaque da página inicial é o lote ao vivo com o maior lance atual. Sem lote ao vivo com lance, entra o ao vivo que encerra primeiro; sem lote ao vivo, o próximo agendado; sem lote nenhum, o bloco some. O lote escolhido não troca enquanto o usuário está na página; só os valores atualizam ao vivo.
**Por quê:** o maior lance aponta para a disputa mais movimentada, que é o que vale mostrar primeiro. A escolha sai dos dados, sem curadoria manual.
**Alternativas descartadas:** lote que encerra primeiro (cria urgência, mas pode destacar um lote sem disputa); destaque escolhido pelo leiloeiro (exige campo e tela a mais); trocar o destaque em tempo real (o lote mudaria na frente do usuário).
**Consequência:** a vitrine precisa de uma consulta que ordene os lotes ao vivo pelo lance atual, com índice que a sustente.

## D-038: Dados da obra só do acervo

Status: Aceita
Data: 2026-10-24
Story: planejamento

**Decisão:** título, artista, descrição e demais dados da obra vêm só do snapshot da Cleveland. O leiloeiro não edita o título nem acrescenta observações ou texto livre ao lote.
**Por quê:** impede anunciar uma peça com nome ou descrição falsos, e mantém vitrine, sala, auditoria e comprovante fiéis ao acervo.
**Alternativas descartadas:** título editável ou campo de observações (mais flexível, mas abre espaço para descrição enganosa e para texto livre sem moderação).
**Consequência:** a ficha do novo lote mostra os dados do acervo só para leitura. O leiloeiro define apenas lance inicial, incremento mínimo, início e fim.

## D-039: Carteira para toda conta

Status: Aceita
Data: 2026-10-25
Story: planejamento

**Decisão:** todo usuário ganha uma carteira no cadastro, inclusive o leiloeiro. A liquidação credita o valor do arremate na carteira do leiloeiro. Depósito e as rotas de carteira continuam só para o licitante.
**Por quê:** o enunciado diz "credita-se ao leiloeiro"; com carteira, o crédito é um movimento real de saldo na mesma transação do débito do vencedor, travado pela mesma regra de ordem por `id`.
**Alternativas descartadas:** total recebido calculado só pela soma dos comprovantes, sem carteira do leiloeiro (não há crédito de fato, só um relatório).
**Consequência:** a carteira é criada na mesma transação do cadastro, e a migration cria a carteira dos usuários já existentes. O painel do leiloeiro lê o total recebido dos comprovantes, não do saldo.

## D-040: Hash de senha com `scrypt` nativo e guard JWT à mão

Status: Aceita
Data: 2026-10-25
Story: planejamento

**Decisão:** senha guardada com `crypto.scrypt` do Node, salt aleatório por usuário e comparação com `timingSafeEqual`. Token emitido e verificado com `@nestjs/jwt`, num guard escrito à mão, sem `passport`.
**Por quê:** `scrypt` é um KDF resistente a força bruta e já vem no Node, sem dependência nova nem binário nativo para compilar no Render. O guard à mão tem poucas linhas e evita três pacotes (`@nestjs/passport`, `passport`, `passport-jwt`) para uma estratégia só.
**Alternativas descartadas:** `bcrypt` (binário nativo, dependência a mais); `argon2` (melhor KDF, mas dependência nativa); `passport-jwt` (abstração a mais para um único fluxo).
**Consequência:** o hash guarda salt e parâmetros junto (`scrypt$N$r$p$salt$hash`), para os parâmetros poderem mudar depois sem invalidar senhas antigas.

## D-041: `react-router` v7 no modo biblioteca

Status: Aceita
Data: 2026-10-25
Story: planejamento

**Decisão:** roteamento do front com `react-router` v7 no modo biblioteca (`createBrowserRouter`), sem o modo framework.
**Por quê:** o front é um SPA estático no Render; o modo biblioteca não traz build próprio, SSR nem convenção de arquivos, e encaixa no Vite que já existe.
**Alternativas descartadas:** modo framework do React Router (substitui o build do Vite e puxa SSR que não é usado); TanStack Router (mais tipado, mas menos conhecido pelo avaliador).
**Consequência:** rotas declaradas em `web/src/app/`, com guarda por papel feita no próprio layout das rotas.

## D-042: Lance atual guardado no lote, como cópia só para exibição

Status: Aceita · Story: 3.2

**Decisão:** a tabela `lots` guarda `current_bid` e `bid_count`, atualizados na mesma transação de cada lance, com o lote travado. Essas colunas servem só para exibir e ordenar (vitrine, destaque, painel). Tudo que envolve dinheiro ou vencedor lê a tabela de lances: a liquidação, o comprovante e a regra de "você já está ganhando" usam sempre o último lance da cadeia.
**Por quê:** a vitrine lista vários lotes com o lance atual de cada um. Calcular o maior lance na tabela de lances a cada listagem é mais caro e mais difícil de indexar. Com a cópia no lote, a listagem lê uma coluna só. Mas a cópia não é protegida pela cadeia de HMAC: se alguém alterar `current_bid` direto no banco, nada detecta. A tabela de lances é protegida, e qualquer alteração nela aparece na auditoria. Por isso a cópia nunca decide quem paga nem quanto.
**Alternativas descartadas:** calcular o maior lance e a contagem na tabela de lances a cada listagem (sem dado duplicado, mas mais lento e sem índice simples); usar `current_bid` também na liquidação (abriria fraude sem detecção: trocar o valor da cópia mudaria o valor cobrado e a auditoria continuaria íntegra).
**Consequência:** se a cópia for adulterada, o pior efeito é a vitrine mostrar um número errado; o valor cobrado e o vencedor continuam corretos. Testes da liquidação devem cobrir esse caso: `current_bid` diferente do último lance e a liquidação usando o lance da cadeia.

## D-043: 422 para todas as recusas de lance

Status: Aceita · Story: 4.3

**Decisão:** as cinco recusas de lance (`BID_BELOW_MINIMUM`, `INSUFFICIENT_BALANCE`, `ALREADY_WINNING`, `LOT_NOT_STARTED`, `LOT_ENDED`) respondem 422, com `{ code, ...detalhe }`. O front decide a mensagem pelo `code`, nunca pelo status.
**Por quê:** em todas o pedido é bem formado, mas fere uma regra de negócio. Um status só deixa o filter simples e evita que o front dependa de uma divisão que não muda nada na tela.
**Alternativas descartadas:** 409 para estado do lote e liderança e 422 para valor e saldo (divisão defensável, mas sem uso no front e mais um mapeamento para manter).
**Consequência:** 400 fica só para `VALIDATION_FAILED`, 404 para lote inexistente ou cancelado, 403 para `ROLE_NOT_ALLOWED`.

## D-044: Alias com 6 caracteres em base32

Status: Aceita · Story: 4.2

**Decisão:** o alias do licitante no lote é "Licitante " seguido dos 6 primeiros caracteres em base32 do HMAC `alias:` de `user_id` + `lot_id` (ex.: "Licitante K7QX2M").
**Por quê:** o front deriva "você está ganhando" comparando `me.alias` com o alias do evento. Dois licitantes com o mesmo alias no mesmo lote veriam os dois "ganhando". Com 6 caracteres (30 bits), a chance de colisão entre os licitantes de um lote é desprezível; com 4 (20 bits), deixa de ser.
**Alternativas descartadas:** 4 caracteres (mais curto de ler, mas risco real de colisão); alias sequencial por lote, como "Licitante 3" (sem colisão, mas exige guardar o número e revela a ordem de entrada).
**Consequência:** o alias é calculado, não guardado. Mudar o tamanho depois muda todos os aliases exibidos, mas não afeta a cadeia, que assina o `user_id`.

## D-045: Lote encerrado no seed com `Clock` deslocado

Status: Aceita · Story: 6.1

**Decisão:** além do lote ao vivo, o seed cria um lote já encerrado e liquidado. Para isso, o seed troca o `Clock` por um deslocado para o passado enquanto cria esse lote e os lances dele, sempre pelos services; depois volta ao relógio real e liquida o lote pelo service de liquidação.
**Por quê:** o avaliador precisa ver comprovante, total recebido e a aba Encerrados no primeiro acesso, sem esperar um lote terminar. Passando pelos services, a cadeia de HMAC, o selo e a assinatura do comprovante saem válidos.
**Alternativas descartadas:** só o lote ao vivo, com o roteiro pedindo para criar um lote curto (o avaliador espera minutos para ver a liquidação); `INSERT` direto com datas no passado (cadeia inválida, a auditoria acusaria adulteração, D-020).
**Consequência:** o `Clock` precisa ser trocável no contexto do seed. As datas desse lote ficam no passado de verdade, como se o leilão tivesse acontecido.

## D-046: `id` de usuário `integer` autoincremento

Status: Aceita
Data: 2026-10-25
Story: 2.1

**Decisão:** a chave de `users` é `integer` com autoincremento (`SERIAL`). O JWT leva o `id` como string no `sub`.
**Por quê:** simplicidade: chave curta, legível no log de queries e no banco, e sem tipo extra nas entidades que referenciam o usuário.
**Alternativas descartadas:** UUID com `gen_random_uuid()` (nativo no PG 17, sem extensão; esconderia a contagem de usuários, mas o `id` não aparece para outros usuários: auditoria e comprovante usam alias).
**Consequência:** o `id` é sequencial e previsível, então nenhuma rota pode usá-lo como prova de acesso; quem fala por outro usuário passa sempre pelo token. As chaves estrangeiras para `users` são `integer`.

## D-047: Token da sessão no `localStorage`

Status: Aceita
Data: 2026-10-25
Story: 2.3

**Decisão:** o front guarda `{ token, user }` no `localStorage`. No boot, lê o `exp` do JWT sem chamar a API: token expirado ou ilegível volta a visitante. Qualquer 401 numa chamada que levou token também encerra a sessão.
**Por quê:** com o JWT no header (D-006), o token precisa ficar acessível ao JavaScript; o `localStorage` faz a sessão sobreviver ao recarregamento. Conferir o `exp` localmente evita chamar `/auth/me` no boot, que travaria o app durante o cold start do Render.
**Alternativas descartadas:** cookie httpOnly (front e API em domínios diferentes, descartado na D-006); token só em memória (recarregar a página desloga); `sessionStorage` (cada aba pede login de novo).
**Consequência:** um XSS poderia ler o token. A mitigação é o escape padrão do React (nada de `dangerouslySetInnerHTML`) e a validade de 8h do token.

## D-048: Valores sempre com centavos

Status: Aceita
Data: 2026-10-26
Story: 2.4

**Decisão:** o front formata todo valor em reais com duas casas decimais (R$ 1,00, R$ 100.000,00): saldos, avisos de limite, mensagens de erro e de confirmação e botões de atalho.
**Por quê:** a API e os lances aceitam centavos (D-015), e o campo de valor mostra centavos; esconder ",00" nos textos deixava a tela inconsistente.
**Alternativas descartadas:** omitir ",00" em valores inteiros (mais curto, mas mistura dois formatos na mesma tela).
**Consequência:** toda tela nova usa o `formatMoney` de `web/src/shared/lib/money.ts`; nada de formatar moeda à mão.

## D-049: Saldo atualizado só depois da confirmação da API

Status: Aceita
Data: 2026-10-26
Story: 2.4

**Decisão:** a atualização do saldo é pessimista: tela e cabeçalho só mudam com a carteira devolvida pela API depois do depósito.
**Por quê:** com dinheiro, não se mostra saldo que a API ainda não confirmou; se o depósito falhar, a tela nunca exibiu um valor errado.
**Alternativas descartadas:** atualização otimista (resposta instantânea, mas exige desfazer o valor exibido quando a API recusa).
**Consequência:** o botão fica em "Depositando…" até a resposta; no cold start do Render isso pode levar até 1 min.

## D-050: Busca no acervo por departamento escolhido

Status: Aceita
Data: 2026-10-26
Story: 3.1

**Decisão:** a busca no acervo recebe um departamento, com duas opções: European Painting and Sculpture (padrão) e Greek and Roman Art. Cada busca faz uma chamada à Cleveland, só nesse departamento.
**Por quê:** a Cleveland não aceita dois departamentos na mesma chamada (vírgula, `|` e `;` devolvem zero resultados; parâmetro repetido usa só o último; `department[]` é ignorado). Escolher o departamento mantém o tema da casa e a paginação exata da Cleveland.
**Alternativas descartadas:** acervo inteiro (foge do tema de arte clássica europeia); duas chamadas juntando os resultados (dobra a latência e o risco de timeout, e a paginação e o total combinados ficam inexatos).
**Consequência:** a tela do leiloeiro (3.5) precisa de um seletor de departamento. A criação de lote aceita peça de qualquer um dos dois departamentos; peça de outro departamento é tratada como inexistente.

## D-051: Peça em um lote ativo por vez

Status: Aceita
Data: 2026-10-26
Story: 3.2

**Decisão:** uma peça do acervo só pode estar em um lote agendado ou ao vivo (não cancelado e `now < ends_at`) por vez. A criação de outro lote da mesma peça devolve 409 `ARTWORK_ALREADY_LISTED`; lote encerrado ou cancelado libera a peça.
**Por quê:** dois lotes simultâneos da mesma obra significariam vender a mesma peça duas vezes e confundiriam a vitrine.
**Alternativas descartadas:** permitir lotes simultâneos da mesma peça (venda duplicada); bloquear a peça para sempre depois do primeiro lote (peça encerrada sem lance ou cancelada nunca voltaria ao leilão).
**Consequência:** a checagem roda dentro da transação da criação, depois de `pg_advisory_xact_lock(artwork_id)`, para duas criações simultâneas da mesma peça não passarem juntas; `lots.artwork_id` tem índice.

## D-052: Id de lote inválido responde 404

Status: Aceita
Data: 2026-10-26
Story: 3.3

**Decisão:** o `:id` das rotas de lote passa por um `LotIdPipe` que aceita só dígitos de 1 ao teto do `integer`; qualquer outro valor (`abc`, `0`, `9999999999`) responde 404, sem consultar o banco.
**Por quê:** segue o padrão que `GET /lots/:id/image` já usava na 3.2: um id fora do `integer` nunca existe, então a resposta é a mesma de um lote inexistente, e o Postgres não chega a dar erro de faixa (500).
**Alternativas descartadas:** `ParseIntPipe` do Nest (400 fora do formato `VALIDATION_FAILED` e sem checar o teto do `integer`); 400 `VALIDATION_FAILED` para id malformado (distingue "id inválido" de "não existe" sem ganho para o front, que mostra "lote não encontrado" nos dois casos).
**Consequência:** toda rota nova com `:id` de lote (cancelamento, lances, stream, auditoria) usa o mesmo pipe.

## D-053: Número do lote só depois da criação

Status: Aceita
Data: 2026-10-26
Story: 3.5

**Decisão:** a ficha de novo lote não mostra o número que o lote vai receber ("2. Ficha do lote", sem número). O número em romano aparece só na confirmação, com o `number` devolvido pelo `POST /lots`: "Lote {romano} publicado…". Substitui o trecho do critério da ficha que pedia o número antes da criação.
**Por quê:** o número é gerado por sequência global no banco; prever o próximo na tela mostraria um número errado sempre que outro leiloeiro criasse um lote antes, ou quando uma criação falhasse e consumisse a sequência.
**Alternativas descartadas:** endpoint com o próximo número (continua sujeito a corrida e a buracos da sequência, e muda a API); reservar o número ao abrir a ficha (exige estado de rascunho no banco).
**Consequência:** a ficha só mostra dados da obra e as condições; o leiloeiro vê o número na faixa de sucesso e no livro de lotes.

## D-054: Número do lote em romano com o número comum ao lado

Status: Aceita
Data: 2026-10-27
Story: 3.5 · Substitui D-036

**Decisão:** o número do lote aparece sempre em romano com o número comum ao lado: "Lote DXXXVII · nº 537". Acima de 3999, onde o romano padrão acaba, aparece só o número comum ("Lote nº 4000"). O número continua sequencial, global, único e imutável, e a busca aceita "537" ou "DXXXVII".
**Por quê:** o romano fica longo e difícil de ler com o crescimento da numeração (888 vira DCCCLXXXVIII), quem não lê romano não sabe qual número digitar na busca, e a notação padrão não passa de 3999.
**Alternativas descartadas:** só o número comum (perde a identidade visual do tema); romano só nos destaques e número comum nas listas (dois formatos na mesma interface).
**Consequência:** toda tela usa o `lotLabel` de `web/src/shared/lib/roman.ts`; o `toRoman` devolve `null` fora de 1 a 3999.

## D-055: Commit do teste vermelho antes da implementação nas stories TDD

Status: Aceita
Data: 2026-10-27
Story: 4.1

**Decisão:** nas stories em TDD (4.1, 4.2, 5.1, 5.5), cada grupo de casos vira um commit `test` com os `it` falhando, seguido do commit `feat` que os faz passar. É a exceção à regra "todo commit passa nos testes".
**Por quê:** o histórico da branch serve de evidência do TDD (D-019). O squash merge (D-021) garante que a `main` nunca recebe commit vermelho: os commits `test` vermelhos ficam só na branch, e o CI roda no topo da PR, que fica verde.
**Alternativas descartadas:** teste e código no mesmo commit (o histórico não mostra que o teste veio antes).
**Consequência:** `git bisect` na branch de uma story TDD encontra commits vermelhos de propósito; na `main` isso não acontece.

## D-056: Formato canônico do conteúdo assinado

Status: Aceita
Data: 2026-10-27
Story: 4.2

**Decisão:** todo conteúdo assinado é `<prefixo>:` seguido dos campos em ordem fixa, separados por `|`, com HMAC-SHA256 em hex. Prefixos: `bid:` (`lot_id|seq|user_id|valor|data|hash anterior`), `seal:` (`lot_id|contagem|último hash`), `alias:` (`user_id|lot_id`) e `receipt:`. Data em ISO 8601 UTC com milissegundos (`toISOString()`), valor inteiro em centavos, e o primeiro lance (ou o lote sem lances) usa o `GENESIS` (64 zeros) como hash anterior.
**Por quê:** a mesma entrada precisa gerar sempre o mesmo texto, senão a verificação falha sem adulteração nenhuma. O separador impede que dígitos passem de um campo para o vizinho sem mudar o hash (caso 12), e o prefixo impede que uma assinatura valha em outro contexto (D-029). O `lot_id` no selo impede que lotes sem lances tenham selos iguais: sem ele, quem apagasse todos os lances de um lote poderia copiar o selo de qualquer lote vazio e a auditoria mostraria o lote como íntegro.
**Alternativas descartadas:** JSON canônico (depende da ordem das chaves e da serialização de números); campos com prefixo de tamanho (mais robusto para texto livre, desnecessário com números, ISO e hex); data em epoch ms (menos legível na auditoria).
**Consequência:** o formato não muda depois do seed, pelo mesmo motivo do segredo: todas as assinaturas gravadas deixariam de bater e a auditoria acusaria todos os lotes. O caso 15 (`chain.spec.ts`, valor conhecido) fixa o formato do lance e o caso 8 fixa o do selo: qualquer mudança neles quebra o teste.

## D-057: Só o UNIQUE (lot_id, seq) indexa os lances por lote

Status: Aceita
Data: 2026-10-27
Story: 4.3

**Decisão:** a tabela `bids` tem o `UNIQUE (lot_id, seq)` e nenhum índice separado em `lot_id`. É um desvio consciente do critério da story, que pedia os dois.
**Por quê:** o índice do `UNIQUE` começa por `lot_id`, então já atende às buscas por lote (último lance por `seq DESC`, histórico, auditoria, `EXISTS` do cancelamento). Um índice só em `lot_id` duplicaria o mesmo caminho e custaria escrita em todo lance.
**Alternativas descartadas:** `bids_lot_id` além do `UNIQUE` (redundante para todas as consultas previstas).
**Consequência:** consulta nova sobre `bids` que filtre por outra coluna (ex.: `user_id`, na carteira da 4.7) avalia o próprio índice.

## D-058: Selo vazio gravado na criação do lote

Status: Aceita
Data: 2026-10-27
Story: 4.3

**Decisão:** o `POST /lots` grava o selo do lote sem lances (`lot_id`, contagem 0, `GENESIS`) na mesma transação da criação. A coluna `lots.seal` é nula só em lote criado antes desta migration.
**Por quê:** com o selo desde o início, a auditoria (5.5) detecta também a remoção de todos os lances de um lote, e não só do final da cadeia.
**Alternativas descartadas:** selo nulo até o primeiro lance (lote com todos os lances apagados ficaria igual a um lote que nunca recebeu lance); `NOT NULL` com selo calculado na migration (a migration precisaria do segredo).
**Consequência:** na 5.5, selo nulo conta como não íntegro. Em produção o banco é recriado na entrega, então nenhum lote fica com selo nulo.

## D-059: Lance recusado quando o selo do lote não confere

Status: Aceita
Data: 2026-10-27
Story: 4.3

**Decisão:** antes de gravar um lance, o service recalcula o selo esperado (`lot_id`, `seq` do último lance ou 0, hash do último lance ou `GENESIS`) com os dados já lidos na transação e compara com `lots.seal`. Se não bater, inclusive com selo nulo, o lance é recusado com 409 `LOT_INTEGRITY_FAILED` e nada é gravado.
**Por quê:** sem a conferência, quem apagasse lances do fim da cadeia direto no banco veria o próximo lance reusar o `seq` e reassinar o selo, e a auditoria passaria a mostrar o lote como íntegro: a evidência da remoção sumiria.
**Alternativas descartadas:** deixar a detecção só para a auditoria da 5.5 (o próximo lance apagaria a evidência antes de alguém abrir a auditoria); gravar o lance e só registrar a divergência (o selo novo continuaria cobrindo a cadeia adulterada).
**Consequência:** lote com a cadeia adulterada para de aceitar lances até alguém investigar; lote antigo, sem selo, também. Não custa query a mais: usa o lote travado e o último lance já lidos.

## D-060: Catálogo falso nos testes e2e

Status: Aceita
Data: 2026-10-27
Story: 4.4

**Decisão:** a app dos testes e2e troca o `CatalogService` por um falso, que devolve a peça (com título configurável por `artworkId`) e uma imagem fixa. Os lotes continuam sendo criados por `POST /lots`.
**Por quê:** o e2e prova lances, concorrência e vitrine contra um Postgres real; depender da Cleveland deixaria o CI instável e lento por um motivo alheio ao que está sendo testado. O download real e a validação da imagem já têm teste unitário desde a 3.2.
**Alternativas descartadas:** chamar a Cleveland de verdade (rede no CI, peça que pode mudar ou sumir); servidor HTTP falso imitando a Cleveland (mais código de teste para cobrir o que os unitários já cobrem); `INSERT` direto em `lots` (pularia o selo vazio e o fluxo do leiloeiro, D-045).
**Consequência:** o e2e não detecta mudança no formato da resposta da Cleveland; isso fica com os testes do mapeamento.

## D-061: Um container Postgres por execução do e2e, suítes em série

Status: Aceita
Data: 2026-10-27
Story: 4.4

**Decisão:** o `globalSetup` do Jest sobe um único `postgres:17` com Testcontainers e exporta as variáveis de ambiente; o `globalTeardown` derruba. As suítes rodam em série (`--runInBand`), cada uma sobe a própria app (migrations no boot) e começa com `TRUNCATE ... RESTART IDENTITY CASCADE` de todas as tabelas, menos a de migrations.
**Por quê:** um container só custa um boot do Postgres por execução, e as suítes em série não disputam o mesmo banco. O `TRUNCATE` deixa cada suíte independente da ordem.
**Alternativas descartadas:** um container por suíte (vários segundos a mais por suíte, sem ganho de isolamento real); um banco por suíte no mesmo container (mais código de setup para paralelizar três suítes curtas); transação com rollback por teste (o teste de concorrência precisa de várias conexões vendo os commits umas das outras).
**Consequência:** suíte nova começa com `reset()`. Rodar as suítes em paralelo exigiria um banco por suíte.

## D-062: Data do lance no evento do stream

Status: Aceita
Data: 2026-10-27
Story: 4.5

**Decisão:** o evento `bid` do `GET /lots/:id/stream` traz `seq`, valor, alias, `createdAt` e `endsAt`.
**Por quê:** a sala (4.6) mostra o horário de cada lance no histórico; com a data no evento, ela acrescenta a linha sem buscar o histórico de novo. A data já é pública no histórico e na auditoria.
**Alternativas descartadas:** só `seq`, valor, alias e `endsAt` (a sala refaria `GET /lots/:id/bids` a cada lance, uma query por espectador por lance).
**Consequência:** a lista de campos públicos do stream no CLAUDE.md inclui `createdAt`; qualquer campo novo no evento continua exigindo decisão.

## D-063: Teto de 20 lotes comprometidos na carteira, sem paginação

Status: Aceita
Data: 2026-10-27
Story: 4.5

**Decisão:** `GET /wallet` traz até 20 lotes que comprometem saldo (os que terminam primeiro) e `lotsTotal` com a contagem de todos, sem parâmetro de página. É exceção declarada à regra "toda listagem é paginada".
**Por quê:** a lista é um resumo dentro da carteira, limitado na prática pelo saldo do licitante; um teto com o total mantém a resposta pequena sem levar paginação para a tela da Carteira. 20 é o mesmo tamanho de página do histórico.
**Alternativas descartadas:** sem teto (resposta sem limite, contra a regra); `?page=` no `/wallet` (paginação na Carteira por um caso raro).
**Consequência:** com mais de 20 lotes, a Carteira (4.7) mostra os 20 primeiros e o total; ver todos exigiria uma rota própria.

## D-064: Liquidação bloqueada quando o selo do lote não confere

Status: Aceita
Data: 2026-10-27
Story: 5.2

**Decisão:** selo divergente ou nulo não liquida: nada é gravado, o log registra só o id do lote, e o lote fica encerrado e não liquidado.
**Por quê:** apagar o último lance direto no banco faria cobrar o penúltimo licitante, cujo comprometido já foi liberado.
**Alternativas descartadas:** liquidar mesmo assim e deixar a detecção para a auditoria (cobraria a pessoa errada).
**Consequência:** o comprometido do vencedor fica preso, e cada acesso tenta de novo e loga, até alguém investigar.
