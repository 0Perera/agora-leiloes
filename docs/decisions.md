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
