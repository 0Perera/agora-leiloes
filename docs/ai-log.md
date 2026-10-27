# Uso de IA

Registro de onde e como usei IA no projeto, o que revisei e pedi para mudar e o que rejeitei. Uma entrada por story, mais esta de planejamento.

## Resumo

Este projeto foi feito com ajuda de inteligência artificial, com papéis separados:

- **Eu decido:** as regras do leilão, o que entra e o que fica de fora, como cada tela funciona e quando uma parte está pronta.
- **O Claude Code implementa:** escreve o código, os testes e a documentação, e registra cada mudança no histórico do projeto.
- **O Claude app pesquisa e revisa:** ajuda a entender o desafio, compara alternativas e dá uma segunda opinião sobre o que o Claude Code propõe.

Cada parte do sistema passou por três passos:

1. **Plano:** o Claude Code escreve um plano curto, com a lista de testes. Eu respondo as dúvidas e aprovo ou peço mudanças.
2. **Implementação:** o Claude Code escreve o código e os testes. Depois, revisores independentes procuram falhas, e eu decido o que é corrigido.
3. **Conferência:** testo no navegador, em telas de vários tamanhos, e só então decido se a parte entra na versão principal.

Alguns erros da ferramenta que corrigi:

- Afirmou que, num lance de última hora, o comum era o leilão acabar dois minutos depois do lance. Pedi para conferir: não há um padrão único, e a casa de leilões citada no próprio desafio soma os dois minutos ao horário de término. Ficou assim.
- Sugeriu permitir a mesma obra em vários leilões ao mesmo tempo. Recusei, porque a casa venderia a mesma peça duas vezes.
- Sugeriu decidir se um leilão pode ser cancelado por um contador de lances que não é protegido contra adulteração. Recusei: alguém com acesso ao banco poderia zerar o contador e cancelar um leilão disputado.
- A proteção do histórico dava o mesmo selo a todos os leilões sem lances, e quem apagasse os lances de um deles poderia copiar o selo de outro. Pedi a correção, com testes.

O que não deleguei:

- As regras do negócio e a escolha entre alternativas.
- A lista de testes de cada parte.
- A conferência das telas e a decisão de publicar cada parte.

## Ferramentas

- **Claude (app):** apoio de pesquisa e consulta durante o planejamento e na revisão das propostas do agente, junto com buscas no Google e na documentação oficial. Parte dos ajustes pedidos nas revisões veio de sugestões dele, que conferi contra as decisões antes de pedir; algumas recusei. As decisões registradas em "O que revisei e pedi para mudar" foram minhas.
- **Claude Code:** implementação e commits. Os commits das branches das stories, que nunca são apagadas, levam o trailer `Co-Authored-By`; a partir da 4.1, a mensagem do squash na `main` também leva. Assim dá para ver no histórico do Git o que passou pela IA.

## Modelo de entrada

```
## Story X.Y: título

**O que a IA gerou:**
**O que revisei e pedi para mudar:**
**Sugestões rejeitadas e por quê:**
```

---

## Planejamento (22 e 23/10/2026)

Antes de escrever código, usei o Claude para destrinchar o enunciado e decidir stack, tema, arquitetura e regras de trabalho. As decisões finais estão em `docs/decisions.md` (D-001 a D-022).

**O que a IA gerou:**
- Leitura do enunciado separando requisitos funcionais, regras de lance e requisitos não funcionais.
- Pesquisa e comparação de APIs públicas para o tema (cartas colecionáveis, museus, LEGO), com os problemas de cada uma.
- Comparações lado a lado para eu decidir: TypeORM x Prisma (com o mesmo model escrito nos dois), SSE x WebSocket x Socket.IO, cookie x JWT no header, Render x Neon x Koyeb.
- Análise do enunciado em busca de armadilhas de arquitetura (cota do Neon com cron, seed quebrando a cadeia de HMAC, `EventSource` sem header, rewrite do SPA, entre outras).
- Rascunho do `CLAUDE.md`, do `docs/decisions.md` e do workflow que valida o título da PR.

**O que revisei e pedi para mudar:**
- No começo, a IA saiu definindo stack e cronograma inteiros. Pedi para parar e decidi item por item. A única coisa fixa desde o início era o NestJS.
- O tema começou como cartas de TCG. Pedi que a IA me mostrasse qual API pública era mais confiável para realizar o projeto. Com base na comparação, escolhi a do Cleveland Museum of Art e decidi mudar o tema para obras de arte.
- Pedi outra direção visual: arte clássica europeia (mármore, estátuas, museus clássicos), e não contemporânea.
- Decidi testar a API da Cleveland na minha máquina, porque a checagem da IA pela web devolvia resposta em cache e não servia como prova. Duas chamadas travaram; num loop de diagnóstico, todas voltaram 200 em menos de 1s.
- Pedi uma avaliação do custo do TDD em tokens e tempo e decidi usá-lo só nas regras críticas.
- Como o alias no SSE me pareceu gambiarra, pedi a comparação com WebSocket. Decidi manter o SSE por causa do prazo, sabendo o que perderia.
- Pedi que as imagens fossem baixadas e guardadas, porque o enunciado pede que tudo funcione com a API fora do ar.
- Escolhi o Postgres do Render em vez do Neon. A IA tinha recomendado o Neon porque o free do Render expira em 30 dias, mas o Elite Dev avalia em até 4 dias após a entrega. Decidi recriar o banco no dia da entrega, para os 30 dias cobrirem o processo inteiro.
- Pedi o `decisions.md` e este log.

**Sugestões rejeitadas e por quê:**
- *Cronograma e stack completos logo no início:* eu queria entender e decidir cada parte.
- *Pinger externo para evitar cold start:* preferi aceitar o cold start e avisar no README.
- *Imagens do seed versionadas no repositório:* não quero binários no repo. O seed baixa as imagens pelo fluxo normal.
- *Socket.IO:* resolveria a autenticação do stream, mas o custo em tempo não cabia no prazo.
- *Regra extra de lint `no-floating-promises`:* fiquei com o padrão do Nest, o limite de complexidade e o `no-explicit-any` (D-028).
- *Cancelamento com estorno e dark mode:* fora do escopo, por causa do prazo.

**Erro da IA que peguei:**
- Para o anti-sniping, a IA afirmou que "fim = agora + 2 min" era o comportamento comum em leilões. Pedi para conferir, e a pesquisa mostrou que não existe um padrão único: o Catawiki, uma das referências do próprio desafio, soma o tempo ao fim atual. A decisão final (D-011) foi pela leitura literal do enunciado e pelo Catawiki.

## Story 1.1: Esqueleto do monorepo no ar

**O que a IA gerou:**
- `docker-compose.yml` com o Postgres, projeto Nest (config de envs validada, TypeORM, migration inicial vazia, `/health` com teste) e projeto React com a página "API: ok".
- Workflow de CI com os jobs `api`, `web` e `readme`, e os commits da story.
- Seção "Rodar local" do README, o `render.yaml`, os Dockerfiles e o compose completo, e as entradas D-031 a D-035.

**O que revisei e pedi para mudar:**
- Decidi rodar as migrations no boot (`migrationsRun`) em vez de no start command (D-031).
- O Nest CLI atual gerou Vitest, oxlint e ESM. Pedi para fixar o CLI 11 e instalar só versões das libs `@nestjs/*` compatíveis com o Nest 11, conferindo o `peerDependencies` antes do commit (D-032).
- Decidi fazer o commit inicial direto na `main` e, daí em diante, uma branch por story.
- O template do Vite também trocou ESLint por oxlint. Decidi manter o oxlint, com as mesmas duas regras da API (D-033).
- Pedi o deploy via Blueprint, ainda no plano free, na região Virginia (D-034). A IA conferiu os campos do `render.yaml` na documentação do Render (`staticPublishPath` relativo ao `rootDir`, sintaxe de `routes`).
- Pedi para trazer o compose completo (D-030) para esta story. A IA avisou que estava fora do escopo escrito; decidi incluir, com o front em nginx (D-035).
- Pedi uma revisão final, e nela a IA achou um bug que ela mesma tinha introduzido: o ajuste do `tsconfig` para o TS 6 tirou o cache incremental da `dist` e quebrou o `start:dev`. A IA corrigiu e pôs um segundo build no CI para pegar a regressão.
- Pedi Prettier no front, com a mesma config da API, e `strictPropertyInitialization` ligado, para ficar coerente com o `!` exigido nas entidades.

**Sugestões rejeitadas e por quê:**
- *Aceitar o template do Nest 12:* contrariava as decisões de testes e lint já tomadas.

## Story 2.1: Cadastro e login na API

**O que a IA gerou:**
- Módulos `users` e `auth` (`POST /auth/signup`, `POST /auth/login`, `GET /auth/me`), entidade `User` e a migration `Users` gerada pelo CLI.
- Em `common/`: `DomainException` com código, `DomainExceptionFilter`, `validationPipe()` no formato `VALIDATION_FAILED`, `AuthGuard`, `RolesGuard` e os decorators `@Auth` e `@CurrentUser`.
- Hash de senha com `scrypt` nativo, `SafeLogger` do TypeORM sem parâmetros de query, env `JWT_SECRET` e os testes unitários aprovados na spec.
- Correção feita pela própria IA: instalou o `@nestjs/jwt` 12, que é só ESM e quebrou o Jest, e trocou pelo 11.x, que aceita o Nest 11 e segue o D-032.

**O que revisei e pedi para mudar:**
- Decidi os casos de teste antes da implementação e pedi um a mais, o do e-mail normalizado para minúsculas: sem isso, "Ana@x.com" e "ana@x.com" virariam duas contas e o login falharia por capitalização.
- Pedi que o erro de login fosse o mesmo para e-mail inexistente e senha errada (`INVALID_CREDENTIALS`), para a API não revelar quais e-mails têm conta.
- Decidi o formato dos erros de validação (`VALIDATION_FAILED` com o campo e a regra), para o front traduzir cada campo.
- Escolhi o `scrypt` nativo do Node em vez de `bcrypt`, para não depender de compilação nativa dentro do Docker.
- Decidi senha de 8 a 128 caracteres e `id` de usuário inteiro (D-046).

**Sugestões rejeitadas e por quê:**
- *`passport-jwt`:* três pacotes para uma estratégia só (D-040).

## Story 2.2: Carteira e depósito simulado na API

**O que a IA gerou:**
- Módulo `wallets`: entidade `Wallet` (`UNIQUE (user_id)` e `CHECK` de saldo), migration `Wallets` gerada pelo CLI com o `INSERT` das carteiras dos usuários existentes, `GET /wallet` e `POST /wallet/deposits` só para licitante.
- Regra pura `deposit` com o teto do `integer` e o código `BALANCE_LIMIT_EXCEEDED` (422); depósito numa transação com `FOR UPDATE` na carteira.
- Cadastro gravando usuário e carteira na mesma transação, e os testes unitários aprovados na spec.
- Correção feita pela própria IA: a primeira migration gerada tinha o `UNIQUE (user_id)` duplicado (coluna `unique` mais o do `OneToOne`) e um `ON DELETE CASCADE` que a spec não pedia; tirou os dois e gerou de novo.

**O que revisei e pedi para mudar:**
- Pedi para registrar no `CLAUDE.md` as regras de execução: só o revisor de casos de borda fora das stories críticas, correção automática só de achado grave, contexto do épico reaproveitado, leitura só da seção da story no `epics.md` e "O que revisei" sem invenção.
- Decidi o código do depósito acima do teto: `BALANCE_LIMIT_EXCEEDED`, com status 422 para seguir o padrão das recusas de lance (D-043), e pedi que entrasse no `CLAUDE.md`.
- Pedi um caso de teste a mais: depósito não altera o comprometido (com R$ 500 comprometidos, depositar R$ 100 aumenta o disponível em R$ 100).
- Aprovei o `POST /wallet/deposits` com 201 devolvendo a carteira inteira.
- Decidi que não há extrato de movimentações e pedi a linha em "Fora do escopo" no README.

**Sugestões rejeitadas e por quê:**
- *Teto do saldo com status 400:* troquei para 422, o mesmo das recusas de lance (D-043); 400 fica só para `VALIDATION_FAILED`.
- *Teto como `VALIDATION_FAILED` com `fields.amount`:* a regra depende do saldo no banco, não é validação do DTO.

## Story 2.3: Telas Entrar e Criar conta

**O que a IA gerou:**
- Rotas com `react-router` 7 (`createBrowserRouter`), layout com cabeçalho por papel, `RequireRole`, `GuestOnly` e o provider de sessão em `web/src/app/`.
- Client único com Bearer, `ApiError` (status, código e campos) e encerramento da sessão em 401 com token; sessão no `localStorage` validada pelo `exp` do JWT (D-047).
- Telas `/login` e `/signup` reescritas em React a partir do canvas, com `tokens.css` e `bundle.css` copiados sem edição; tradução dos erros da API por código e por campo em `auth-errors.ts`.
- Vitrine e painel do leiloeiro provisórios, `vitest` com os testes aprovados na spec e o passo `npm test` no job `web` do CI.
- Correção feita pela própria IA na revisão: o aviso de sessão expirada dependia do state da navegação e podia se perder no redirecionamento da guarda (e reaparecer ao recarregar); passou para um estado em memória no provider de sessão.

**O que revisei e pedi para mudar:**
- Escolhi o canvas `docs/design/Entrar.dc.html` como referência e pedi a cópia de `tokens.css` e `bundle.css` para `web/src/shared/ui/` e a reescrita em React, sem o runtime nem a simulação do canvas.
- Escolhi um `/dashboard` mínimo protegido por papel para o leiloeiro até a story 3.5.
- Pedi o botão "Sair" no cabeçalho para licitante e leiloeiro.
- Aprovei o `vitest` como devDependency com os casos propostos e pedi o `npm test` no job `web` do CI.
- Pedi para registrar o token no `localStorage` no `decisions.md`, com o trade-off (XSS; cookie httpOnly descartado pela D-006; mitigado pelo escape do React e pela validade de 8h) (D-047).
- Pedi que o usuário logado que abre `/login` ou `/signup` vá para a página do seu papel.
- Pedi que o 401 que encerra a sessão leve para `/login` com o aviso "Sua sessão expirou, entre de novo".
- Decidi manter a spec inteira, acima do limite de tamanho, em vez de dividir.

**Sugestões rejeitadas e por quê:**
- Nenhuma: as opções recomendadas foram aceitas, com os acréscimos acima.

## Story 2.4: Tela Carteira

**O que a IA gerou:**
- Tela `/wallet` em `features/wallet` a partir do canvas `Carteira.dc.html`: equação total − comprometido = disponível, lista de comprometidos no estado vazio, ficha de depósito com chips, estados de carregando e erro com "Tentar de novo".
- Provider de carteira montado no layout só para licitante, com um `GET /wallet`, e o resumo da carteira no cabeçalho, atualizado pela resposta do depósito sem novo `GET`.
- `formatMoney` e `parseAmount` em `shared/lib/money.ts`, validação e tradução dos erros do depósito, e os testes aprovados na spec.
- `FieldError` e o estilo de campo inválido movidos para `shared/ui/`; tokens `--space-*` nos CSS e `App` com export nomeado.
- Testes de `validateAmount` (vazio, abaixo do mínimo, acima do máximo), acrescentados pela IA para cobrir a matriz da spec, fora da lista aprovada.
- Máscara de moeda no campo (`maskAmount` em `shared/lib/money.ts`), com testes: só dígitos, que entram pela direita nos centavos.
- Ajustes depois do teste no navegador: valores sempre com centavos, confirmação curta do depósito em `ag-notice`, classes CSS com prefixo `wallet-`, D-048, D-049 e a story opcional de pagamento simulado no `deferred-work.md`.
- Correção feita pela própria IA na revisão: digitar ou clicar num chip durante o envio apagava o valor novo; campo e chips passaram a travar enquanto o depósito está em andamento.

**O que revisei e pedi para mudar:**
- Pedi a story com o canvas `docs/design/Carteira.dc.html` como referência.
- Pedi um commit `refactor(web)` separado com os tokens de espaçamento, o `App` com export nomeado e a remoção do `.gitkeep` (que já tinha saído na 2.3).
- Pedi a regra no `CLAUDE.md` de nunca apagar a branch da story depois do merge.
- Pedi a troca do título "O que revisei ou reescrevi" por "O que revisei e pedi para mudar", só com os verbos decidi, escolhi, aprovei, recusei e pedi, e a revisão das entradas antigas.
- Decidi o mínimo de R$ 1, igual à API, com o texto "De R$ 1 a R$ 100.000".
- Escolhi aceitar reais com centavos ("1.500,50") e pedi o `parseAmount` em `shared/lib`, para o formulário de lance reaproveitar.
- Aprovei os testes, com os casos de `parseAmount` definidos por mim: aceita "1.500", "1500", "1.500,50" e "1500,5"; recusa texto, mais de duas casas decimais e vazio.
- Decidi manter a spec inteira, acima do limite de tamanho.
- Aprovei mover `FieldError` para `shared/ui/` num refactor separado, o widget de carteira no cabeçalho sem o monograma e o extrato fora da tela.
- Pedi uma máscara de moeda no campo de depósito, para ninguém digitar ponto e vírgula à mão: a formatação aparece sozinha conforme os dígitos entram.
- Aprovei os 6 testes da máscara e os 3 de `validateAmount`; com a máscara, colar "R$ 1.500,00" deixou de ser problema.
- Pedi valores sempre com duas casas decimais em todo o app (avisos, erros, atalhos e confirmação), porque o campo mostrava centavos e os textos não (D-048).
- Pedi a confirmação curta do depósito ("Depósito confirmado" / "R$ 5.000,00 adicionados ao seu saldo."), sem repetir saldo e disponível, que a tela e o cabeçalho já mostram.
- Pedi o prefixo da feature nas classes CSS da carteira, para não colidirem com telas futuras.
- Decidi registrar a atualização pessimista do saldo (D-049): com dinheiro, não se mostra saldo que a API não confirmou.
- Pedi a linha "O depósito é simulado, sem meio de pagamento (Pix, cartão)." em "Fora do escopo".
- Pedi o registro de uma story opcional de pagamento simulado (Pix ou cartão de teste, só no front, 45 min) para depois do épico 5.
- Pedi a atualização do README (Rodar local, Stack e decisões, Testes e Uso de IA) num commit `docs` separado.

**Sugestões rejeitadas e por quê:**
- *Mínimo de R$ 10, como no canvas:* a tela ficaria mais restrita que a API.
- *Só reais inteiros no campo:* desperdiçaria a precisão em centavos da API.
- *Valores inteiros sem ",00":* troquei por duas casas sempre, para bater com o campo (D-048).
- *Confirmação repetindo saldo total e disponível:* troquei por uma mensagem curta, porque a tela já mostra os valores.
- *`parseAmount` dentro de `features/wallet`:* o lance vai usar o mesmo parse, então foi para `shared/lib`.

## Story 3.1: Busca no acervo da Cleveland

**O que a IA gerou:**
- Módulo `catalog`: `ClevelandClient` com `fetch` nativo, timeout de 5s, `fields` explícitos e `has_image=1`; mapeamento puro de `unknown` para `Artwork` e `ArtworkDetail`; cache em memória com TTL de 10 min, limite de 500 entradas e `now` injetado.
- `CatalogService.search` (cache por departamento, termo normalizado e página) e `CatalogService.find(id)` para a 3.2, sem cache, devolvendo `null` para 404 ou peça de outro departamento.
- `GET /catalog/search` só para leiloeiro, com `q`, `department` e `page` validados; código `CATALOG_UNAVAILABLE` (503); env `CLEVELAND_API_URL` na validação, no `.env.example`, no compose e no `render.yaml`.
- Tipos `Artwork` e `CatalogSearch` no front, D-050 e linhas do README.
- Testes aprovados na spec: mapeamento do artista e descarte sem imagem, cache e falha no service, departamento fora da lista no DTO. O caso de `culture` em lista virou dois `it` (primeiro item; lista vazia), por causa da regra de uma regra por `it`.

**O que revisei e pedi para mudar:**
- Escolhi restringir a busca ao tema da casa e pedi para checar se a Cleveland aceita mais de um departamento na mesma chamada, para incluir Greek and Roman Art.
- Aprovei os 8 casos de teste propostos e pedi um a mais: `culture` vem como lista, então o fallback usa o primeiro item, e lista vazia conta como ausente.
- Decidi manter a spec inteira acima do teto de tokens e pedi que, daqui em diante, só se pergunte quando der para dividir em entregas independentes.
- Pedi um parâmetro `department` com duas opções validadas (European Painting and Sculpture como padrão, Greek and Roman Art), uma chamada por busca, e departamento fora da lista recusado com `VALIDATION_FAILED`, com teste.
- Pedi que `find(id)` aceite peça dos dois departamentos e recuse as de fora.
- Pedi a D-050 com o motivo (a Cleveland não aceita dois departamentos na mesma chamada) e a linha em "Comportamentos esperados" do README.
- Decidi que a tela com o seletor de departamento fica para a 3.5.
- Decidi manter Monet fora da busca (o departamento dele é o de arte moderna, fora do tema) e pedi "portrait" como exemplo de busca no lugar de "monet".
- Aprovei testes automáticos do DTO para termo vazio e página inválida; 401/403 ficam com os testes dos guards.
- Decidi não corrigir os achados opcionais da revisão: buscas simultâneas duplicadas, espaços internos no termo e `total` contando peças descartadas.

**Sugestões rejeitadas e por quê:**
- *Só European Painting and Sculpture, sem seletor:* troquei por um seletor com Greek and Roman Art, porque estátuas e mármore fazem parte do tema.
- *Acervo inteiro:* foge do tema de arte clássica europeia (D-050).

## Story 3.2: Criação de lote com snapshot e imagem

**O que a IA gerou:**
- `Clock` injetável em `common/`, códigos `IMAGE_DOWNLOAD_FAILED` (502) e `ARTWORK_ALREADY_LISTED` (409) no exception filter.
- `ClevelandClient.download` e `CatalogService.image`: timeout de 5s, só `image/jpeg`, `image/png` ou `image/webp`, até 5 MB contados nos bytes lidos do stream, qualquer falha virando `IMAGE_DOWNLOAD_FAILED`.
- Entidades `Lot` (snapshot, condições, `number` por sequência com `UNIQUE`, índices em `starts_at`, `ends_at`, `artwork_id` e `auctioneer_id`, `CHECK` de período, valores e `bid_count`) e `LotImage` (`bytea`), com a migration gerada pelo CLI.
- Regras puras em `lot.rules.ts` (início até 1 min no passado, fim depois do início, peça já em lote ativo) e `LotsService.create`: valida as datas, busca a peça, baixa a imagem fora da transação e grava lote e imagem numa transação com `pg_advisory_xact_lock(artwork_id)`.
- `POST /lots` só para leiloeiro e `GET /lots/:id/image` público, com `Cache-Control` longo e `X-Content-Type-Options: nosniff`.
- Tipos `CreateLotRequest` e `CreatedLot` e a tradução de `ARTWORK_ALREADY_LISTED` no front, D-051 e linhas do README e do `CLAUDE.md`.
- Testes aprovados na spec: datas e peça listada nas regras, download com `fetch` falso, falha da imagem sem gravar lote no service e limites no DTO.

**O que revisei e pedi para mudar:**
- Escolhi responder 400 `VALIDATION_FAILED` com `fields.artworkId: 'notFound'` para peça inexistente ou de outro departamento.
- Decidi que uma peça só fica em um lote agendado ou ao vivo por vez, com 409 `ARTWORK_ALREADY_LISTED` traduzido no front; encerrado ou cancelado libera a peça (D-051).
- Aprovei os limites: lance inicial de R$ 1 a R$ 10 mi e incremento de R$ 1 a R$ 1 mi.
- Aprovei os nove casos de teste propostos e pedi mais um: recusa peça em lote agendado ou ao vivo e aceita se o lote anterior foi cancelado ou encerrou.
- Aprovei as decisões da spec (campo extra descartado pelo `whitelist`, só JPEG/PNG/WebP, download antes da transação, `auctioneer_id` já nesta story, índice de `current_bid` na 3.3).
- Pedi a regra no `CLAUDE.md` de rodar `npm run lint:check` antes de commitar, em vez de `npm run lint`, que corrige sozinho e esconde erro de formatação.

**Sugestões rejeitadas e por quê:**
- *Permitir a mesma peça em vários lotes ao mesmo tempo:* recusei, porque venderia a mesma obra duas vezes; a peça só fica em um lote ativo por vez (D-051).

## Story 3.3: Vitrine, destaque e detalhe do lote na API

**O que a IA gerou:**
- `LotIdPipe` (id inteiro de 1 ao teto do `integer`, senão 404 sem tocar o banco), aplicado no detalhe e na imagem, em commit `refactor` separado (D-052).
- Índice `lots_current_bid`, com a migration gerada pelo CLI (D-037).
- `GET /lots`: vitrine paginada de 12 com status calculado por `CASE` no SQL com o `now` do `Clock`, busca `ILIKE` em título e artista com curingas escapados, filtro por número e contagem das três abas com a busca aplicada, em duas queries.
- `GET /lots/featured`: cadeia ao vivo com maior lance, ao vivo que encerra primeiro e próximo agendado, até 3 queries, 204 sem lote; rota declarada antes de `:id`.
- `GET /lots/:id`: snapshot, condições, status, lance atual, nº de lances e `serverTime`, numa query; cancelado ou inexistente dá 404.
- DTOs de resposta como classes, tipos `LotStatus`, `LotCard`, `LotShowcase` e `LotDetail` no front e linhas do README.
- Testes aprovados na spec: os quatro passos do destaque com repository falso, número romano e status fora da lista no DTO, id não inteiro e acima do teto no pipe.

**O que revisei e pedi para mudar:**
- Pedi para marcar a 3.2 como done antes de começar e para reaproveitar o contexto do épico.
- Defini que o status é calculado na query com o `now` do `Clock` e que lote cancelado nunca aparece na vitrine nem no destaque, e responde 404 no `GET /lots/:id`.
- Pedi `GET /lots/featured` declarado antes de `GET /lots/:id` e o `:id` validado por pipe, seguindo o 404 que o projeto já usava.
- Pedi o `serverTime` em ISO no detalhe.
- Decidi que o teste de integração dos fallbacks do destaque fica para a 4.4 e que aqui entram testes unitários do service.
- Pedi desempate no destaque entre lotes com o mesmo lance: fim mais próximo e depois número do lote, coberto pelo caso de teste 1.
- Pedi para escapar também a barra invertida na busca, além de `%` e `_`.
- Pedi `page` validado como inteiro maior ou igual a 1.
- Pedi que os testes de integração da vitrine (cancelado fora das três rotas, contagens com busca, ordem de cada aba) fiquem para a 4.4, com o Testcontainers.
- Aprovei os oito casos de teste da spec.
- Pedi só o revisor de casos de borda nesta story.
- Pedi para o `number` da vitrine aceitar só dígitos (`1e3`, `0x10` e ` 7` recusados com 400), com um caso de teste no DTO.
- Decidi manter o teto de 100 no `page`.
- Aceitei os outros dois achados da revisão (divergência momentânea das contagens e imagem de lote cancelado) como comportamentos conhecidos, registrados no `deferred-work.md`.
- Aprovei registrar o 404 do `LotIdPipe` como decisão (D-052).

**Sugestões rejeitadas e por quê:**
- *Destaque desempatado só pelo fim mais próximo:* pedi também o número do lote, para o desempate ser determinístico.
- *Busca escapando só `%` e `_`:* pedi a barra invertida também, porque ela é o caractere de escape do `LIKE` no Postgres.

## Story 3.4: Painel do leiloeiro na API

**O que a IA gerou:**
- `STATUS_SQL` e `STATUS_WHERE` movidos para `lots/lot-status.ts`, em commit `refactor` separado, para o painel reusar o cálculo da vitrine.
- `POST /lots/:id/cancel`: lote travado com `FOR UPDATE` filtrando por dono e `cancelled_at IS NULL` (alheio, inexistente ou já cancelado dão 404), regra pura `assertCancellable` (encerrado `LOT_ENDED` antes de `LOT_HAS_BIDS`) e 204; duas queries.
- Códigos `LOT_HAS_BIDS` (409) e `LOT_ENDED` (422) no `DomainCode` e no filter.
- `GET /dashboard/lots`: livro paginado de 20, `number DESC`, status com `cancelled`, contagem dos cinco filtros, em duas queries.
- `GET /dashboard/summary`: ao vivo com soma dos lances atuais, agendados com próximo início e encerrados com quantos sem lance, numa query.
- DTOs de resposta como classes, tipos `BookStatus`, `DashboardLot`, `DashboardBook` e `DashboardSummary` no front e linhas do README.
- Testes aprovados na spec: cinco de `assertCancellable`, três de `LotsService.cancel` com manager falso, status fora da lista no DTO e resumo sem lotes.

**O que revisei e pedi para mudar:**
- Pedi a branch da story a partir da `main` atualizada, com a 3.3 marcada como done antes de começar.
- Pedi o `LotIdPipe` (D-052) em toda rota com `:id` de lote.
- Aprovei as escolhas da spec: livro em `number DESC`, 20 por página, contagem dos cinco filtros, 204 no cancelamento, 404 para lote já cancelado e `LOT_ENDED` antes de `LOT_HAS_BIDS`.
- Decidi que "tem lance" no cancelamento sai do `bid_count` da linha travada por enquanto, e pedi para registrar em `deferred-work.md` a troca por `EXISTS` em `bids` na 4.3, porque `bid_count` é só cache de exibição.
- Pedi o caso de teste (10): cancela lote agendado sem lances e grava `cancelled_at` com o `now` do `Clock`.
- Aprovei os casos de teste 1 a 10.
- Pedi para conferir no log do Postgres que `GET /dashboard/lots` e `GET /dashboard/summary` disparam número fixo de queries.
- Pedi só o revisor de casos de borda e `npm run lint:check` antes do commit.
- Pedi para ajustar a frase do README sobre o cancelamento: só lote sem lances, como pede o enunciado, porque cancelar com lances exigiria estorno, opcional que não entrou (D-018).
- Pedi para confirmar o registro da troca por `EXISTS` (D-042) para a 4.3 em `deferred-work.md`.
- Pedi para apagar o banco de rascunho `agora_scratch34` e desligar o log de queries.

**Sugestões rejeitadas e por quê:**
- *Justificativa do cancelamento no README ("quem deu lance já tem saldo comprometido"):* pedi a regra do enunciado e o motivo real, o estorno fora do escopo (D-018).

**Erro da IA que peguei:**
- O Claude (app) sugeriu usar o `bid_count` de forma definitiva na checagem de "tem lance" do cancelamento. Apontei que contrariava a D-042: o contador não está na cadeia de HMAC e poderia ser alterado direto no banco para burlar a regra.

## Story 3.5: Tela Painel do leiloeiro

**O que a IA gerou:**
- `/dashboard` em `features/auctioneer`: cabeçalho da página com "Novo lote"/"Fechar novo lote" (`aria-expanded`, estado em `?new` na URL), resumo em três cartões, seção de novo lote (busca + ficha) e livro de lotes.
- Busca no acervo com seletor de departamento (D-050), erro de campo para termo vazio sem chamar a API, seis esqueletos, vazio, erro "O acervo do museu não respondeu" com "Tentar de novo", cartões-botão com `aria-pressed` e imagem do CDN, e paginação Anterior/Próxima.
- Ficha só leitura (título, artista, data, técnica, tipo e imagem) com os quatro campos editáveis, máscara de maquininha nos valores, `datetime-local` convertido para ISO UTC, validação pura em `lot-validation.ts` com as faixas da API e resumo "Corrija N campos". Faixa de sucesso com o número em romano devolvido pela API (D-053).
- `lot-errors.ts` com `createError` (`VALIDATION_FAILED` por campo, `IMAGE_DOWNLOAD_FAILED`, `ARTWORK_ALREADY_LISTED`, `CATALOG_UNAVAILABLE`, conexão) e `cancelError` (`LOT_HAS_BIDS`, `LOT_ENDED`, 404).
- Livro com cinco filtros e contagem, 20 por página, miniatura de `GET /lots/:id/image`, carimbo "Cancelado", cancelamento com confirmação na linha e recarga de livro e resumo; vira cartões com `data-label` abaixo de 1180px.
- Client tipado com `catalogSearch`, `createLot`, `cancelLot` (trata 204), `dashboardLots`, `dashboardSummary` e `lotImageUrl`; helpers `toRoman`, `lotLabel` e `formatShortDate`/`fromLocalInput`/`toLocalInput` em `shared/lib`.
- Testes dos casos aprovados: `roman.spec.ts`, `date.spec.ts`, `lot-validation.spec.ts` e `lot-errors.spec.ts`.

**O que revisei e pedi para mudar:**
- Pedi que a ficha não mostrasse o número que o lote vai receber, porque o número é global e sequencial e outro leiloeiro pode pegá-lo no meio; o romano aparece só na confirmação, com o valor devolvido pelo `POST /lots` (D-053).
- Decidi mostrar romano e número comum juntos ("Lote DXXXVII · nº 537"), só o número comum acima de 3999, numa decisão que substitui a D-036 (D-054), com uma linha no README sobre o formato.
- Escolhi omitir Dimensões e Nº no acervo da ficha e recusei a leitura do romano, porque a 3.5 só exibe.
- Pedi as datas exibidas no fuso do navegador, igual aos campos de início e fim, com `TZ=America/Sao_Paulo` fixado na config do vitest para o teste passar igual no CI e na máquina local.
- Pedi a busca no acervo sempre visível, o livro vazio só com texto e, depois de criar, uma janela modal ("Lote VI · nº 6 publicado", "Ver no livro" e "Criar outro lote") que limpa a ficha ao fechar, com `role="dialog"`, foco preso e Esc.
- Pedi os ajustes visuais do painel: valores sempre com centavos (D-048) e classes `ag-*` do canvas, departamento em lista suspensa sem a borda azul, cartões da busca em `auto-fill` de 200px, coluna Nº centralizada e destaque dourado do lote recém-criado respeitando `prefers-reduced-motion`.
- Pedi dois casos a mais em `lot-errors.spec.ts` (`LOT_HAS_BIDS` e `LOT_ENDED`), aprovei as outras escolhas da spec e pedi registrar "Abrir sala" no livro para a 3.7 em `deferred-work.md`.
- Pedi só o revisor de casos de borda e `npm run lint:check` antes do commit.

**Sugestões rejeitadas e por quê:**
- *Faixa de sucesso dentro da seção de novo lote:* recusei; pedi uma janela modal com ações para ver o lote no livro ou criar outro.
- *Seção de novo lote aberta pelo botão "Novo lote" e pelo link "Criar lote" no cabeçalho:* recusei; pedi a busca sempre visível no painel.
- *Botão "Criar o primeiro lote" no livro vazio:* recusei; pedi só o texto orientando a busca.
- *Casos (2) e (3), leitura do romano de volta e recusa de romano inválido:* recusei, a tela só exibe o romano.
- *Caso (4) com o fuso do ambiente:* pedi o fuso fixo nos testes, para o resultado não depender da máquina.
- *Datas exibidas sempre em `America/Sao_Paulo`, diferente dos campos da ficha:* recusei; pedi o fuso do navegador nos dois.

## Story 3.6: Tela Página inicial (vitrine)

**O que a IA gerou:**
- `/` em `features/lots`: destaque (`GET /lots/featured` + `GET /lots/:id` uma vez ao montar), vitrine com abas, busca e paginação, e a faixa escura "Como funciona", seguindo o canvas Página inicial.
- Destaque ao vivo com contagem regressiva Min:Seg ou Horas:Min, urgente abaixo de 2 min, e agendado com "Abre em"; some com 204, 404 no detalhe ou lote encerrado; esqueleto e erro com "Tentar de novo".
- Relógio único de 1s na página, corrigido pela diferença do `serverTime` do destaque.
- Vitrine com abas `aria-pressed` e contagem, busca com espera de 300 ms, 12 por página, cards com imagem de `GET /lots/:id/image` no nicho em arco e link cobrindo o card; estados carregando, erro, aba vazia e "Nenhum lote encontrado" com "Limpar busca".
- `parseSearch` em `showcase-search.ts` (número, romano, "lote ..." ou texto; número impossível não chama a API), `fromRoman`, `formatDay` e `countdown.ts` em `shared/lib`.
- `Pager` movido para `shared/ui`, client com `lots`, `featured` e `lot`, e rota provisória `/lots/:id` "Sala do lote" até a 3.7.
- Testes dos casos aprovados (17) a (30): `roman.spec.ts`, `date.spec.ts`, `countdown.spec.ts` e `showcase-search.spec.ts`.

**O que revisei e pedi para mudar:**
- Aprovei os casos de teste (17) a (30) da spec.
- Decidi que só dígitos, romano canônico em maiúscula ou romano em qualquer caixa com o prefixo "lote " viram `number`; palavra solta em minúscula como "di" ou "mix" vai como texto.
- Decidi o grid de cards com `repeat(auto-fill, minmax(250px, 1fr))`, igual ao painel, em vez de preencher a linha com poucos resultados.
- Decidi a rota provisória `/lots/:id` com o título "Sala do lote" até a 3.7, porque o Render publica a main a cada merge e nenhum link pode cair em tela de erro.
- Pedi só o revisor de casos de borda na revisão.
- Pedi para registrar no `deferred-work.md`, numa seção de polimento visual, o ajuste do painel no modo cartão (selo e botão na largura do conteúdo, miniatura alinhada ao título).
- Pedi, depois de conferir a tela, a imagem do destaque antes do texto quando o destaque empilha, com o arco limitado a ~55vh para o título e o botão ficarem perto; lado a lado acima disso.
- Pedi que a busca abra a primeira aba com resultado pelas contagens da resposta (Ao vivo, Agendados, Encerrados), fique na aba atual sem resultado e volte para Ao vivo ao limpar, com um caso de teste para a escolha da aba.
- Pedi duas regras no `CLAUDE.md`: selos, badges e botões com a largura do próprio conteúdo em grids e listas, e a conferência das telas em 360, 768, 1024 e 1280px na Definition of Done.

**Sugestões rejeitadas e por quê:**
- *Cards esticados para preencher a linha com poucos resultados:* recusei; pedi o mesmo grid do painel, com os cards no tamanho natural.

## Story 3.7: Tela Sala do lote ao vivo (leitura)

**O que a IA gerou:**
- `/lots/:id` em `features/live-room`, no lugar da página provisória: cabeçalho com selo, `lotLabel`, título e linha "artista, data · técnica"; resumo com lance atual, vencedor ou inicial e a contagem de lances; obra no nicho em arco com a imagem de `GET /lots/:id/image`; "Sobre a obra e o lote" com descrição e ficha.
- Contagem Min:Seg ou Horas:Min corrigida pelo `serverTime`, urgente abaixo de 2 min, 00:00 com "Lote encerrado." no lote encerrado e bloco "Abre em" no agendado; timer de 1s só com o lote ao vivo.
- Virada de estado com a página aberta: um `GET /lots/:id` silencioso ao chegar no início ou no fim, com o status vindo da API; erro nesse GET mantém a tela.
- Estados carregando (esqueleto só com cabeçalho, resumo e obra), "Lote não encontrado" para 404 e id inválido sem chamar a API, e erro com "Tentar de novo".
- Layout em duas colunas no desktop e empilhado abaixo de 880px, com a obra primeiro e o arco limitado a ~55vh.
- "Abrir sala" no livro do painel para todo lote não cancelado.
- Testes dos casos aprovados (31) a (37) em `room-summary.spec.ts` e (38) em `artwork-type.spec.ts`.
- Mapa fixo de tradução do tipo da obra (`shared/lib/artwork-type.ts`) e nova busca na virada até 3 vezes.

**O que revisei e pedi para mudar:**
- Pedi para seguir o canvas da Sala e as classes `ag-*`, substituindo a página provisória da 3.6.
- Pedi para reaproveitar o helper de contagem com `serverTime` da 3.6, sem criar outro.
- Pedi que a tela ficasse completa sem os blocos do épico 4 (lance, histórico, tempo real), sem espaços vazios ou placeholders.
- Pedi número no formato da D-054, datas no fuso do navegador e valores com centavos (D-048).
- Pedi "Abrir sala" no livro do painel, item registrado no `deferred-work.md` na 3.5.
- Aprovei os casos de teste (31) a (36) da spec.
- Decidi o layout abaixo de 880px igual ao destaque da página inicial: obra primeiro, arco limitado a ~55vh, sem miniatura no cabeçalho.
- Aprovei refazer o `GET /lots/:id` uma vez quando o lote abre ou encerra com a página aberta.
- Decidi "Abrir sala" no painel em todo lote não cancelado (ao vivo, agendado e encerrado), sumindo durante a confirmação de cancelamento.
- Pedi que a virada de estado tente de novo a cada 2 s, no máximo 3 vezes, quando o status vier igual, com um caso de teste.
- Pedi texto de erro neutro na sala, sem menção a lance: "Não foi possível carregar o lote. Verifique a conexão e tente de novo."
- Pedi o subtítulo do cabeçalho só com artista e data, com a técnica apenas em "Sobre a obra e o lote".
- Pedi o tipo da obra traduzido por mapa fixo no front, com um caso de teste; decidi aplicar só na sala e na busca do acervo do Painel, sem mudar a API para o card.
- Pedi uma linha no README explicando que os dados das obras aparecem em inglês, como no acervo (D-038).

**Sugestões rejeitadas e por quê:**
- *Cabeçalho com miniatura antes da obra no mobile:* recusei; pedi a obra primeiro, como no destaque da página inicial.
- *"Abrir sala" só em lote ao vivo, como no canvas do Painel:* recusei; pedi em todo lote não cancelado, para o leiloeiro abrir também agendados e encerrados.
- *Nova busca da virada uma vez só:* mudei para até 3 tentativas a cada 2 s, para a sala não ficar parada em 00:00 se o servidor demorar a virar o status.
- *Texto de erro do canvas ("Nenhum lance seu foi enviado ou perdido"):* recusei; pedi um texto neutro, porque ainda não há lance.

## Story 4.1: Regras de lance, saldo comprometido e anti-sniping (TDD)

**O que a IA gerou:**
- Função pura `decide` em `api/src/bids/bid.rules.ts`: recebe lote, último lance, licitante, disponível, valor e `now` e devolve aceite (novo `endsAt`, valor a comprometer e valor a liberar) ou recusa (código e detalhe), como união discriminada para a 4.3 mapear sem `as`.
- Escolha de devolver a recusa como valor, em vez de lançar exceção; a 4.3 converte em exceção de domínio.
- Checagens em funções pequenas, na ordem status do lote, líder, valor e saldo; a primeira que falha decide. Início inclusivo e fim exclusivo, como o `STATUS_SQL`.
- Anti-sniping somando 2 min ao fim atual quando faltam 2 min ou menos (D-011); recusa nunca prorroga.
- Contexto do épico 4 (`docs/stories/epic-4-context.md`) e a spec da story.
- Os 29 casos aprovados em `bid.rules.spec.ts`, em seis pares de commits `test(bids)` (vermelho) e `feat(bids)` (verde), um por grupo.

**O que revisei e pedi para mudar:**
- Aprovei os casos 1 a 24 do épico e pedi três a mais: recusa por valor antes de checar o saldo, recusa por saldo informando o disponível e recusa por lote não iniciado informando o início.
- Pedi TDD com cada `it` escrito antes da implementação, em commits que mostram o teste vindo antes do código.
- Pedi os três revisores, por ser story crítica, e `npm run lint:check` antes de cada commit.
- Aprovei dois casos a mais sugeridos na revisão: recusa por status antes de checar a liderança e antes de checar o valor, porque inverter a ordem no código não quebrava nenhum teste.
- Pedi registrar os commits de teste vermelhos como decisão (D-055), citando que o squash merge (D-021) mantém a `main` sem commit vermelho e que eles servem de evidência do TDD (D-019), com a exceção na regra de atomicidade do CLAUDE.md.
- Pedi, antes do push: o caso 23 encadeando duas chamadas para provar o acúmulo, o caso 24 conferindo o código da recusa, apagar o comentário em `accept` que repetia o código e renomear o `describe` para `decide`.
- Pedi registrar para a 4.3 o teste de serviço do licitante superado que volta com o valor cheio (o caso 19 não prova isso na regra pura) e a ligação dos códigos de recusa ao `DomainCode`.
- Pedi que a escolha de devolver a recusa em vez de lançar ficasse em "O que a IA gerou", porque não foi decisão minha.

**Sugestões rejeitadas e por quê:**
- Nenhuma nesta story.

## Story 4.2: Cadeia de HMAC, selo e alias (TDD)

**O que a IA gerou:**
- Funções puras em `api/src/audit/`: `hashBid` e `sealLot` em `chain.ts` e `forLot` em `alias.ts`, recebendo o segredo por parâmetro, só com `node:crypto`.
- Serialização canônica com prefixo de domínio (`bid:`, `seal:`, `alias:`), campos separados por `|`, data em milissegundos UTC e `GENESIS` no lugar do hash anterior ausente.
- Encoder de base32 (RFC 4648) dos 30 primeiros bits do HMAC para o alias.
- Casos 1 a 8 e 12 em dois pares de commits `test(audit)` (vermelho) e `feat(audit)` (verde); o caso 5 foi para o segundo par porque compara com o selo.
- Env `BID_HMAC_SECRET` obrigatória com 32 caracteres ou mais, no `.env.example`, no compose e no `render.yaml`, com o teste do caso 13.

**O que revisei e pedi para mudar:**
- Aprovei os casos 1 a 11 e pedi dois a mais: hash diferente quando dígitos passam de um campo para o vizinho (12) e recusa do segredo ausente ou curto (13).
- Pedi o segredo obrigatório com tamanho mínimo, no `.env.example`, no compose e no `render.yaml`.
- Pedi registrar no `deploy-notes.md` que o segredo nunca muda depois do seed e que, no dia da entrega, o banco é recriado mantendo o segredo.
- Pedi registrar para a 4.3 que o `created_at` do lance vem do `Clock` da aplicação, nunca do `now()` do banco, porque o Postgres guarda microssegundos e o hash usa milissegundos.
- Depois da revisão, aprovei os casos 14, 15 e 16: alias diferente por licitante no mesmo lote, hash conferido contra um valor conhecido e env válida sem o valor do segredo na mensagem de erro.
- Pedi registrar o formato da serialização como decisão (D-056), com o caso 15 como o teste que o fixa, e tipar o prefixo do `sign()` com os quatro contextos.
- Pedi incluir o `lotId` no selo, com os casos 17 (selos de lotes vazios diferentes não coincidem) e 18 (selo muda com o `lotId`) em TDD.

**Erro da IA que peguei:**
- O selo sem o `lotId` deixava todos os lotes sem lances com o mesmo selo: quem apagasse todos os lances de um lote poderia copiar o selo de outro lote vazio e a auditoria mostraria o lote como íntegro.

**Sugestões rejeitadas e por quê:**
- Nenhuma nesta story.

## Story 4.3: Dar lance na API

**O que a IA gerou:**
- `POST /lots/:id/bids` (`@Auth('BIDDER')`, `LotIdPipe`, `PlaceBidDto`) e `BidsService.place`: lock do lote, hora do `Clock` lida depois do lock, último lance por `seq DESC` e carteiras travadas numa query com `ORDER BY id`, tudo só com o `manager`.
- Ligação de `decide()`, `hashBid()`, `sealLot()` e `forLot()`: lance gravado com o `seq` seguinte, `prev_hash` (`GENESIS` no primeiro) e `created_at` do `Clock`; lote atualizado num `UPDATE` (selo, lance atual, contagem, fim); comprometido liberado do líder anterior e comprometido no novo lance.
- Entidade `Bid` e migration com FKs, `CHECK (seq >= 1 AND amount > 0)`, `UNIQUE (lot_id, seq)` e a coluna `lots.seal`.
- `DomainException` com detalhe, quatro códigos novos (422) no filter e códigos da `Refusal` amarrados ao `DomainCode`.
- Cancelamento com `EXISTS` em `bids` depois do lock e selo vazio gravado na criação do lote.
- Os 14 casos aprovados, tipos `PlaceBidRequest`/`PlacedBid` no front e os campos de detalhe no `ApiErrorBody`.
- Depois da revisão: conferência do selo antes de gravar o lance (`LOT_INTEGRITY_FAILED`, 409) em TDD, seis casos novos e os dois ajustes de estilo.

**O que revisei e pedi para mudar:**
- Decidi manter só o `UNIQUE (lot_id, seq)`, sem índice separado em `lot_id`, como desvio consciente do critério (D-057).
- Decidi gravar o selo vazio na criação do lote e tratar selo nulo como não íntegro na 5.5 (D-058).
- Aprovei os casos 1 a 14 e pedi que o caso 8 conferisse os quatro campos do lote (`seal`, `current_bid`, `bid_count`, `ends_at`).
- Aprovei os seis casos sugeridos pela revisão: selo vazio na criação, resposta do lance, `EXISTS` depois do lock, `bid_count` sem lances em `bids`, recusas sem gravação e DTO com valor ausente, zero e válido.
- Decidi tratar já na 4.3 o lance dado depois de lances apagados do fim: recusar com 409 `LOT_INTEGRITY_FAILED` quando o selo não confere, inclusive nulo, sem query a mais e em TDD (D-059).
- Pedi registrar no `deferred-work.md` a tradução de `LOT_INTEGRITY_FAILED` na sala, para a 4.6.
- Pedi corrigir os dois ajustes de estilo: o `code` depois do detalhe no filter e o `bidCount` fora do helper de cancelamento.

**Sugestões rejeitadas e por quê:**
- Nenhuma nesta story.

## Story 4.4: Testcontainers, CI e lances simultâneos

**O que a IA gerou:**
- `setup(app)` extraído do `main.ts`, para a app de teste usar o mesmo pipe e os mesmos filters de produção.
- Infraestrutura do e2e: um Postgres 17 por execução (Testcontainers), app inteira com relógio de teste, catálogo falso e pool de 20 conexões, e tabelas limpas no começo de cada suíte.
- Barreira do teste de concorrência: uma conexão segura a linha do lote, os lances ficam na fila e o teste só solta quando vê todos parados no lock.
- As três suítes com os 22 casos aprovados: lances, lances simultâneos e vitrine.
- Job `api-e2e` no CI e atualização do README.

**O que revisei e pedi para mudar:**
- Decidi usar um catálogo falso nos testes, devolvendo a peça e a imagem, sem chamar a Cleveland (D-060).
- Decidi um container só para a execução inteira, com suítes em série e tabelas limpas no começo de cada uma (D-061).
- Aprovei a extração do `setup(app)` num commit separado.
- Aprovei os casos 1 a 22.
- Pedi registrar no `deferred-work.md` a unificação do CSS repetido entre telas e um padrão único de chamada à API no front.
- Depois da revisão, pedi dois casos novos: saldo devolvido ao licitante superado e prorrogação de 2 min no fim do lote.
- Pedi que o caso dos lances empatados conferisse também carteiras, cadeia e selo, e que o do lote cancelado conferisse a contagem da aba.
- Pedi limite de 15 min no job do CI, catálogo falso tipado e o caso dos lances empatados independente dos outros.

**Sugestões rejeitadas e por quê:**
- Nenhuma nesta story.
