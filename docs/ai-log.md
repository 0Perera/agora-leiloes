# Uso de IA

Registro de onde e como usei IA no projeto, o que revisei e pedi para mudar e o que rejeitei. Uma entrada por story, mais esta de planejamento.

## Resumo

Este projeto foi feito com ajuda de inteligência artificial, com papéis separados:

- **Eu decido e não delego:** as regras do leilão, a escolha entre alternativas, o que entra e o que fica de fora, como cada tela funciona e quando uma parte está pronta para publicar.
- **O Claude Code implementa:** escreve o código, os testes e a documentação, e registra cada mudança no histórico do projeto.
- **O Claude app pesquisa e revisa:** ajuda a entender o desafio, compara alternativas e dá uma segunda opinião sobre o que o Claude Code propõe.

Cada parte do sistema passou por três passos:

1. **Plano:** o Claude Code escreve um plano curto, com a lista de testes. A IA propõe os testes; eu aprovo, corto ou acrescento casos, respondo as dúvidas e aprovo o plano ou peço mudanças.
2. **Implementação:** o Claude Code escreve o código e os testes. Depois, revisores independentes procuram falhas, e eu decido o que é corrigido.
3. **Conferência:** testo no navegador, em telas de vários tamanhos, e só então decido se a parte entra na versão principal.

Alguns erros da ferramenta que corrigi:

- Afirmou que, num lance de última hora, o comum era o leilão acabar dois minutos depois do lance. Pedi para conferir: não há um padrão único, e a casa de leilões citada no próprio desafio soma os dois minutos ao horário de término. Ficou assim.
- Sugeriu permitir a mesma obra em vários leilões ao mesmo tempo. Recusei, porque a casa venderia a mesma peça duas vezes.
- Sugeriu decidir se um leilão pode ser cancelado por um contador de lances que não é protegido contra adulteração. Recusei: alguém com acesso ao banco poderia zerar o contador e cancelar um leilão disputado.
- A proteção do histórico dava o mesmo selo a todos os leilões sem lances, e quem apagasse os lances de um deles poderia copiar o selo de outro. Pedi a correção, com testes.

## Ferramentas

- **Claude (app):** apoio de pesquisa e consulta durante o planejamento e na revisão das propostas do agente, junto com buscas no Google e na documentação oficial. Parte dos ajustes pedidos nas revisões veio de sugestões dele, que conferi contra as decisões antes de pedir; algumas recusei. As decisões registradas em "O que revisei e pedi para mudar" foram minhas.
- **Claude Code:** implementação e commits. Os commits das branches das stories, que nunca são apagadas, levam o trailer `Co-Authored-By`; a partir da 4.1, a mensagem do squash na `main` também leva. Assim dá para ver no histórico do Git o que passou pela IA.

## Modelo de entrada

```
## Story X.Y: título

**O que a IA gerou:**
**O que revisei e pedi para mudar:**
**Sugestões rejeitadas e por quê:**
**Erro encontrado na revisão:**
```

Seção sem item leva `- Nada a registrar.`; cada seção tem no máximo 8 itens.

---

## Planejamento (22 e 23/10/2026)

Antes de escrever código, usei o Claude para destrinchar o enunciado e decidir stack, tema, arquitetura e regras de trabalho. As decisões finais estão em `docs/decisions.md` (D-001 a D-030).

**O que a IA gerou:**
- Leitura do enunciado separando requisitos funcionais, regras de lance e requisitos não funcionais.
- Pesquisa e comparação de APIs públicas para o tema (cartas colecionáveis, museus, LEGO), com os problemas de cada uma.
- Comparações lado a lado para eu decidir: TypeORM x Prisma (com o mesmo model escrito nos dois), SSE x WebSocket x Socket.IO, cookie x JWT no header, Render x Neon x Koyeb.
- Análise do enunciado em busca de armadilhas de arquitetura (cota do Neon com cron, seed quebrando a cadeia de HMAC, `EventSource` sem header, rewrite do SPA, entre outras).
- Rascunho do `CLAUDE.md`, do `docs/decisions.md` e do workflow que valida o título da PR.

**O que revisei e pedi para mudar:**
- No começo, a IA saiu definindo stack e cronograma inteiros. Pedi para parar e decidi item por item. A única coisa fixa desde o início era o NestJS.
- O tema começou como cartas de TCG. Pedi que a IA me mostrasse qual API pública era mais confiável para realizar o projeto. Com base na comparação, escolhi a do Cleveland Museum of Art, mudei o tema para obras de arte e pedi a direção visual de arte clássica europeia (mármore, estátuas, museus clássicos), e não contemporânea.
- Decidi testar a API da Cleveland na minha máquina, porque a checagem da IA pela web devolvia resposta em cache e não servia como prova. Duas chamadas travaram; num loop de diagnóstico, todas voltaram 200 em menos de 1s.
- Pedi uma avaliação do custo do TDD em tokens e tempo e decidi usá-lo só nas regras críticas.
- Como o alias no SSE me pareceu gambiarra, pedi a comparação com WebSocket. Decidi manter o SSE por causa do prazo, sabendo o que perderia.
- Pedi que as imagens fossem baixadas e guardadas, porque o enunciado pede que tudo funcione com a API fora do ar.
- Escolhi o Postgres do Render em vez do Neon. A IA tinha recomendado o Neon porque o free do Render expira em 30 dias; decidi recriar o banco no dia da entrega, para os 30 dias contarem a partir dela.
- Pedi o `decisions.md` e este log.

**Sugestões rejeitadas e por quê:**
- *Cronograma e stack completos logo no início:* eu queria entender e decidir cada parte.
- *Pinger externo para evitar cold start:* preferi aceitar o cold start e avisar no README.
- *Imagens do seed versionadas no repositório:* não quero binários no repo. O seed baixa as imagens pelo fluxo normal.
- *Socket.IO:* resolveria a autenticação do stream, mas o custo em tempo não cabia no prazo.
- *Regra extra de lint `no-floating-promises`:* fiquei com o padrão do Nest, o limite de complexidade e o `no-explicit-any` (D-028).
- *Cancelamento com estorno e dark mode:* fora do escopo, por causa do prazo.

**Erro encontrado na revisão:**
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
- Pedi Prettier no front, com a mesma config da API, e `strictPropertyInitialization` ligado, para ficar coerente com o `!` exigido nas entidades.

**Sugestões rejeitadas e por quê:**
- *Aceitar o template do Nest 12:* contrariava as decisões de testes e lint já tomadas.

**Erro encontrado na revisão:**
- Na revisão final que pedi, a IA achou um bug que ela mesma tinha introduzido: o ajuste do `tsconfig` para o TS 6 tirou o cache incremental da `dist` e quebrou o `start:dev`. A IA corrigiu e pôs um segundo build no CI para pegar a regressão.

## Story 2.1: Cadastro e login na API

**O que a IA gerou:**
- Módulos `users` e `auth` (`POST /auth/signup`, `POST /auth/login`, `GET /auth/me`), entidade `User` e a migration `Users` gerada pelo CLI.
- Em `common/`: `DomainException` com código, `DomainExceptionFilter`, `validationPipe()` no formato `VALIDATION_FAILED`, `AuthGuard`, `RolesGuard` e os decorators `@Auth` e `@CurrentUser`.
- Hash de senha com `scrypt` nativo, `SafeLogger` do TypeORM sem parâmetros de query, env `JWT_SECRET` e os testes unitários aprovados na spec.

**O que revisei e pedi para mudar:**
- Decidi os casos de teste antes da implementação e pedi um a mais, o do e-mail normalizado para minúsculas: sem isso, "Ana@x.com" e "ana@x.com" virariam duas contas e o login falharia por capitalização.
- Pedi que o erro de login fosse o mesmo para e-mail inexistente e senha errada (`INVALID_CREDENTIALS`), para a API não revelar quais e-mails têm conta.
- Decidi o formato dos erros de validação (`VALIDATION_FAILED` com o campo e a regra), para o front traduzir cada campo.
- Escolhi o `scrypt` nativo do Node em vez de `bcrypt`, para não depender de compilação nativa dentro do Docker.
- Decidi senha de 8 a 128 caracteres e `id` de usuário inteiro (D-046).

**Sugestões rejeitadas e por quê:**
- *`passport-jwt`:* três pacotes para uma estratégia só (D-040).

**Erro encontrado na revisão:**
- A IA instalou o `@nestjs/jwt` 12, que é só ESM e quebrou o Jest, e trocou pelo 11.x, que aceita o Nest 11 e segue a D-032.

## Story 2.2: Carteira e depósito simulado na API

**O que a IA gerou:**
- Módulo `wallets`: entidade `Wallet` (`UNIQUE (user_id)` e `CHECK` de saldo), migration `Wallets` gerada pelo CLI com o `INSERT` das carteiras dos usuários existentes, `GET /wallet` e `POST /wallet/deposits` só para licitante.
- Regra pura `deposit` com o teto do `integer` e o código `BALANCE_LIMIT_EXCEEDED` (422); depósito numa transação com `FOR UPDATE` na carteira.
- Cadastro gravando usuário e carteira na mesma transação, e os testes unitários aprovados na spec.

**O que revisei e pedi para mudar:**
- Pedi para registrar no `CLAUDE.md` as regras de execução: só o revisor de casos de borda fora das stories críticas, correção automática só de achado grave, contexto do épico reaproveitado, leitura só da seção da story no `epics.md` e "O que revisei" sem invenção.
- Decidi o código do depósito acima do teto: `BALANCE_LIMIT_EXCEEDED`, com status 422 para seguir o padrão das recusas de lance (D-043), e pedi que entrasse no `CLAUDE.md`.
- Pedi um caso de teste a mais: depósito não altera o comprometido (com R$ 500 comprometidos, depositar R$ 100 aumenta o disponível em R$ 100).
- Aprovei o `POST /wallet/deposits` com 201 devolvendo a carteira inteira.
- Decidi que não há extrato de movimentações e pedi a linha em "Fora do escopo" no README.

**Sugestões rejeitadas e por quê:**
- *Teto do saldo com status 400:* troquei para 422, o mesmo das recusas de lance (D-043); 400 fica só para `VALIDATION_FAILED`.
- *Teto como `VALIDATION_FAILED` com `fields.amount`:* a regra depende do saldo no banco, não é validação do DTO.

**Erro encontrado na revisão:**
- A primeira migration gerada tinha o `UNIQUE (user_id)` duplicado (coluna `unique` mais o do `OneToOne`) e um `ON DELETE CASCADE` que a spec não pedia; a IA tirou os dois e gerou de novo.

## Story 2.3: Telas Entrar e Criar conta

**O que a IA gerou:**
- Rotas com `react-router` 7 (`createBrowserRouter`), layout com cabeçalho por papel, `RequireRole`, `GuestOnly` e o provider de sessão em `web/src/app/`.
- Client único com Bearer, `ApiError` (status, código e campos) e encerramento da sessão em 401 com token; sessão no `localStorage` validada pelo `exp` do JWT (D-047).
- Telas `/login` e `/signup` reescritas em React a partir do canvas, com `tokens.css` e `bundle.css` copiados sem edição; tradução dos erros da API por código e por campo em `auth-errors.ts`.
- Vitrine e painel do leiloeiro provisórios, `vitest` com os testes aprovados na spec e o passo `npm test` no job `web` do CI.

**O que revisei e pedi para mudar:**
- Escolhi o canvas `docs/design/Entrar.dc.html` como referência e pedi a cópia de `tokens.css` e `bundle.css` para `web/src/shared/ui/` e a reescrita em React, sem o runtime nem a simulação do canvas.
- Escolhi um `/dashboard` mínimo protegido por papel para o leiloeiro até a story 3.5.
- Pedi o botão "Sair" no cabeçalho para licitante e leiloeiro.
- Aprovei o `vitest` como devDependency com os casos propostos e pedi o `npm test` no job `web` do CI.
- Pedi para registrar o token no `localStorage` no `decisions.md`, com o trade-off (XSS; cookie httpOnly descartado pela D-006; mitigado pelo escape do React e pela validade de 8h) (D-047).
- Pedi que o usuário logado que abre `/login` ou `/signup` vá para a página do seu papel.
- Pedi que o 401 que encerra a sessão leve para `/login` com o aviso "Sua sessão expirou, entre de novo".

**Sugestões rejeitadas e por quê:**
- Nada a registrar.

**Erro encontrado na revisão:**
- O aviso de sessão expirada dependia do state da navegação e podia se perder no redirecionamento da guarda (e reaparecer ao recarregar); passou para um estado em memória no provider de sessão.

## Story 2.4: Tela Carteira

**O que a IA gerou:**
- Tela `/wallet` em `features/wallet` a partir do canvas `Carteira.dc.html`: equação total − comprometido = disponível, lista de comprometidos no estado vazio, ficha de depósito com chips, estados de carregando e erro com "Tentar de novo".
- Provider de carteira montado no layout só para licitante, com um `GET /wallet`, e o resumo da carteira no cabeçalho, atualizado pela resposta do depósito sem novo `GET`.
- `formatMoney` e `parseAmount` em `shared/lib/money.ts`, validação e tradução dos erros do depósito, e os testes aprovados na spec.
- `FieldError` e o estilo de campo inválido movidos para `shared/ui/`; tokens `--space-*` nos CSS e `App` com export nomeado.
- Testes de `validateAmount` (vazio, abaixo do mínimo, acima do máximo), acrescentados pela IA para cobrir a matriz da spec, fora da lista aprovada.
- Máscara de moeda no campo (`maskAmount` em `shared/lib/money.ts`), com testes: só dígitos, que entram pela direita nos centavos.
- Ajustes depois do teste no navegador: valores sempre com centavos, confirmação curta do depósito em `ag-notice`, classes CSS com prefixo `wallet-`, D-048, D-049 e a story opcional de pagamento simulado no `deferred-work.md`.

**O que revisei e pedi para mudar:**
- Pedi a story com o canvas `docs/design/Carteira.dc.html` como referência e aprovei mover `FieldError` para `shared/ui/`, o widget de carteira no cabeçalho sem o monograma e o extrato fora da tela.
- Pedi a troca do título "O que revisei ou reescrevi" por "O que revisei e pedi para mudar", só com os verbos decidi, escolhi, aprovei, recusei e pedi, e a revisão das entradas antigas.
- Decidi o mínimo de R$ 1, igual à API, com o texto "De R$ 1 a R$ 100.000".
- Escolhi aceitar reais com centavos ("1.500,50"), com o `parseAmount` em `shared/lib` para o formulário de lance reaproveitar, e defini os casos dele: aceita "1.500", "1500", "1.500,50" e "1500,5"; recusa texto, mais de duas casas decimais e vazio.
- Pedi uma máscara de moeda no campo de depósito, para ninguém digitar ponto e vírgula à mão, e aprovei os 6 testes dela e os 3 de `validateAmount`; com a máscara, colar "R$ 1.500,00" deixou de ser problema.
- Pedi valores sempre com duas casas decimais em todo o app, porque o campo mostrava centavos e os textos não (D-048), e decidi a atualização pessimista do saldo: com dinheiro, não se mostra saldo que a API não confirmou (D-049).
- Pedi a confirmação curta do depósito ("Depósito confirmado" / "R$ 5.000,00 adicionados ao seu saldo."), sem repetir saldo e disponível, e o prefixo da feature nas classes CSS, para não colidirem com telas futuras.
- Pedi a linha "O depósito é simulado, sem meio de pagamento (Pix, cartão)." em "Fora do escopo" e o registro de uma story opcional de pagamento simulado (Pix ou cartão de teste, só no front, 45 min) para depois do épico 5.

**Sugestões rejeitadas e por quê:**
- *Mínimo de R$ 10, como no canvas:* a tela ficaria mais restrita que a API.
- *Só reais inteiros no campo:* desperdiçaria a precisão em centavos da API.
- *Valores inteiros sem ",00":* troquei por duas casas sempre, para bater com o campo (D-048).
- *Confirmação repetindo saldo total e disponível:* troquei por uma mensagem curta, porque a tela já mostra os valores.
- *`parseAmount` dentro de `features/wallet`:* o lance vai usar o mesmo parse, então foi para `shared/lib`.

**Erro encontrado na revisão:**
- Digitar ou clicar num chip durante o envio apagava o valor novo; campo e chips passaram a travar enquanto o depósito está em andamento.

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
- Pedi um parâmetro `department` com duas opções validadas (European Painting and Sculpture como padrão, Greek and Roman Art), uma chamada por busca, e departamento fora da lista recusado com `VALIDATION_FAILED`, com teste; e que `find(id)` aceite peça dos dois departamentos e recuse as de fora.
- Pedi a D-050 com o motivo (a Cleveland não aceita dois departamentos na mesma chamada) e a linha em "Comportamentos esperados" do README.
- Decidi que a tela com o seletor de departamento fica para a 3.5.
- Decidi manter Monet fora da busca (o departamento dele é o de arte moderna, fora do tema) e pedi "portrait" como exemplo de busca no lugar de "monet".
- Aprovei testes automáticos do DTO para termo vazio e página inválida; 401/403 ficam com os testes dos guards.
- Decidi não corrigir os achados opcionais da revisão: buscas simultâneas duplicadas, espaços internos no termo e `total` contando peças descartadas.

**Sugestões rejeitadas e por quê:**
- *Só European Painting and Sculpture, sem seletor:* troquei por um seletor com Greek and Roman Art, porque estátuas e mármore fazem parte do tema.
- *Acervo inteiro:* foge do tema de arte clássica europeia (D-050).

**Erro encontrado na revisão:**
- Nada a registrar.

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

**Erro encontrado na revisão:**
- Nada a registrar.

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
- Defini que o status é calculado na query com o `now` do `Clock` e que lote cancelado nunca aparece na vitrine nem no destaque, e responde 404 no `GET /lots/:id`.
- Pedi `GET /lots/featured` declarado antes de `GET /lots/:id`, o `:id` validado por pipe com o 404 que o projeto já usava, registrado como decisão (D-052), e o `serverTime` em ISO no detalhe.
- Aprovei os oito casos de teste da spec e pedi desempate no destaque entre lotes com o mesmo lance: fim mais próximo e depois número do lote, coberto pelo caso de teste 1.
- Pedi para escapar também a barra invertida na busca, além de `%` e `_`.
- Pedi `page` validado como inteiro maior ou igual a 1, com o teto de 100 mantido, e o `number` da vitrine aceitando só dígitos (`1e3`, `0x10` e ` 7` recusados com 400), com um caso de teste no DTO.
- Decidi que os testes de integração dos fallbacks do destaque e da vitrine (cancelado fora das três rotas, contagens com busca, ordem de cada aba) ficam para a 4.4, com o Testcontainers, e que aqui entram testes unitários do service.
- Aceitei os outros dois achados da revisão (divergência momentânea das contagens e imagem de lote cancelado) como comportamentos conhecidos, registrados no `deferred-work.md`.

**Sugestões rejeitadas e por quê:**
- *Destaque desempatado só pelo fim mais próximo:* pedi também o número do lote, para o desempate ser determinístico.
- *Busca escapando só `%` e `_`:* pedi a barra invertida também, porque ela é o caractere de escape do `LIKE` no Postgres.

**Erro encontrado na revisão:**
- Nada a registrar.

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
- Pedi o `LotIdPipe` (D-052) em toda rota com `:id` de lote.
- Aprovei as escolhas da spec: livro em `number DESC`, 20 por página, contagem dos cinco filtros, 204 no cancelamento, 404 para lote já cancelado e `LOT_ENDED` antes de `LOT_HAS_BIDS`.
- Decidi que "tem lance" no cancelamento sai do `bid_count` da linha travada por enquanto, e pedi para registrar em `deferred-work.md` a troca por `EXISTS` em `bids` na 4.3, porque `bid_count` é só cache de exibição (D-042).
- Aprovei os casos de teste 1 a 10, com o caso (10) pedido por mim: cancela lote agendado sem lances e grava `cancelled_at` com o `now` do `Clock`.
- Pedi para conferir no log do Postgres que `GET /dashboard/lots` e `GET /dashboard/summary` disparam número fixo de queries.
- Pedi para ajustar a frase do README sobre o cancelamento: só lote sem lances, como pede o enunciado, porque cancelar com lances exigiria estorno, opcional que não entrou (D-018).

**Sugestões rejeitadas e por quê:**
- *Justificativa do cancelamento no README ("quem deu lance já tem saldo comprometido"):* pedi a regra do enunciado e o motivo real, o estorno fora do escopo (D-018).

**Erro encontrado na revisão:**
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

**Erro encontrado na revisão:**
- Nada a registrar.

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
- Pedi para registrar no `deferred-work.md`, numa seção de polimento visual, o ajuste do painel no modo cartão (selo e botão na largura do conteúdo, miniatura alinhada ao título).
- Pedi, depois de conferir a tela, a imagem do destaque antes do texto quando o destaque empilha, com o arco limitado a ~55vh para o título e o botão ficarem perto; lado a lado acima disso.
- Pedi que a busca abra a primeira aba com resultado pelas contagens da resposta (Ao vivo, Agendados, Encerrados), fique na aba atual sem resultado e volte para Ao vivo ao limpar, com um caso de teste para a escolha da aba.
- Pedi duas regras no `CLAUDE.md`: selos, badges e botões com a largura do próprio conteúdo em grids e listas, e a conferência das telas em 360, 768, 1024 e 1280px na Definition of Done.

**Sugestões rejeitadas e por quê:**
- *Cards esticados para preencher a linha com poucos resultados:* recusei; pedi o mesmo grid do painel, com os cards no tamanho natural.

**Erro encontrado na revisão:**
- Nada a registrar.

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
- Pedi para seguir o canvas da Sala e as classes `ag-*`, substituindo a página provisória da 3.6, e para reaproveitar o helper de contagem com `serverTime` da 3.6, sem criar outro.
- Pedi que a tela ficasse completa sem os blocos do épico 4 (lance, histórico, tempo real), sem espaços vazios ou placeholders.
- Pedi número no formato da D-054, datas no fuso do navegador e valores com centavos (D-048).
- Pedi "Abrir sala" no livro do painel, item registrado no `deferred-work.md` na 3.5, e decidi mostrá-lo em todo lote não cancelado (ao vivo, agendado e encerrado), sumindo durante a confirmação de cancelamento.
- Aprovei os casos de teste (31) a (36) e refazer o `GET /lots/:id` quando o lote abre ou encerra com a página aberta, e pedi que essa busca tente de novo a cada 2 s, no máximo 3 vezes, quando o status vier igual, com um caso de teste.
- Decidi o layout abaixo de 880px igual ao destaque da página inicial (obra primeiro, arco limitado a ~55vh, sem miniatura no cabeçalho) e pedi o subtítulo do cabeçalho só com artista e data, com a técnica apenas em "Sobre a obra e o lote".
- Pedi texto de erro neutro na sala, sem menção a lance: "Não foi possível carregar o lote. Verifique a conexão e tente de novo."
- Pedi o tipo da obra traduzido por mapa fixo no front, com um caso de teste, só na sala e na busca do acervo do Painel, sem mudar a API para o card, e uma linha no README explicando que os dados das obras aparecem em inglês, como no acervo (D-038).

**Sugestões rejeitadas e por quê:**
- *Cabeçalho com miniatura antes da obra no mobile:* recusei; pedi a obra primeiro, como no destaque da página inicial.
- *"Abrir sala" só em lote ao vivo, como no canvas do Painel:* recusei; pedi em todo lote não cancelado, para o leiloeiro abrir também agendados e encerrados.
- *Nova busca da virada uma vez só:* mudei para até 3 tentativas a cada 2 s, para a sala não ficar parada em 00:00 se o servidor demorar a virar o status.
- *Texto de erro do canvas ("Nenhum lance seu foi enviado ou perdido"):* recusei; pedi um texto neutro, porque ainda não há lance.

**Erro encontrado na revisão:**
- Nada a registrar.

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
- Nada a registrar.

**Erro encontrado na revisão:**
- Nada a registrar.

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

**Sugestões rejeitadas e por quê:**
- Nada a registrar.

**Erro encontrado na revisão:**
- O selo sem o `lotId` deixava todos os lotes sem lances com o mesmo selo: quem apagasse todos os lances de um lote poderia copiar o selo de outro lote vazio e a auditoria mostraria o lote como íntegro.

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
- Nada a registrar.

**Erro encontrado na revisão:**
- Nada a registrar.

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
- Aprovei os casos 1 a 22 e a extração do `setup(app)` num commit separado.
- Pedi registrar no `deferred-work.md` a unificação do CSS repetido entre telas e um padrão único de chamada à API no front.
- Depois da revisão, pedi dois casos novos: saldo devolvido ao licitante superado e prorrogação de 2 min no fim do lote.
- Pedi que o caso dos lances empatados conferisse também carteiras, cadeia e selo, e que o do lote cancelado conferisse a contagem da aba.
- Pedi um caso de lances simultâneos do mesmo licitante em dois lotes, com saldo para um só, travando a carteira dele.
- Pedi limite de 15 min no job do CI, catálogo falso tipado e o caso dos lances empatados independente dos outros.

**Sugestões rejeitadas e por quê:**
- O Claude sugeriu remover o `.then((r) => r)` e o `PORT` do teste; testei e os dois são necessários: o supertest só envia a requisição no `then`, e a validação das variáveis exige `PORT` no CI.

**Erro encontrado na revisão:**
- Nada a registrar.

## Story 4.5: Tempo real, histórico e situação do licitante na API

**O que a IA gerou:**
- Stream em memória por lote (`LotEventsService`) e a rota pública `GET /lots/:id/stream`, com heartbeat a cada 25 s e o ouvinte removido ao fechar a conexão.
- Evento do lance emitido depois que a transação termina, fora dela; recusa e falha na transação não emitem.
- Histórico `GET /lots/:id/bids?page=` numa query, do mais recente ao mais antigo, com 404 para lote cancelado ou inexistente.
- `OptionalAuthGuard` reaproveitando a verificação do token, e `me.alias` no detalhe do lote só para licitante.
- Lotes comprometidos em `GET /wallet` numa query, com o índice `bids_user_id` que o `EXPLAIN` mostrou ser necessário.
- Os casos de teste aprovados (unitários e a suíte e2e `realtime`), tipos do front e README.

**O que revisei e pedi para mudar:**
- Decidi a lista de comprometidos com teto de 20 lotes e o total, sem paginação, registrada como exceção à regra de paginação (D-063).
- Decidi que o evento do stream traz também a data do lance (D-062).
- Decidi que `me` só aparece para licitante.
- Decidi o histórico com 20 por página, paginado pelo índice da cadeia, sem depender da contagem copiada no lote (D-042).
- Decidi criar o índice por licitante só se o `EXPLAIN` mostrasse necessidade, com a saída registrada na spec.
- Aprovei os casos de teste da story e os três e2e a mais tirados da tabela de casos.
- Decidi manter o depósito devolvendo só o saldo, com o front juntando o saldo novo à lista já carregada.
- Pedi para corrigir o erro de tipo no setup do e2e e para o README dizer que o stream não limita conexões por lote.

**Sugestões rejeitadas e por quê:**
- Recusei a paginação do histórico por faixa de `seq` a partir da contagem copiada no lote: dependeria dessa cópia (D-042) e quebraria com buracos na sequência; pedi `ORDER BY seq DESC` com `LIMIT` e `OFFSET`.

**Erro encontrado na revisão:**
- Nada a registrar.

## Story 4.6: Tela Sala do lote ao vivo (lances e tempo real)

**O que a IA gerou:**
- `me.hasBid` no detalhe do lote, calculado na mesma query, com teste unitário e um caso e2e.
- Esqueleto e erro com "Tentar de novo" movidos para `shared/ui`, usados pela página inicial, pelo painel e pela sala.
- Client da API com lance, histórico, detalhe das recusas e o stream, que reabre sozinho se o navegador desistir da conexão.
- Sala completa: situação do licitante, formulário com atalhos e recusas traduzidas, histórico ao vivo e nota de prorrogação.
- Lances do POST, do stream e da reconexão unidos pelo `seq`, sem duplicar e sem dado antigo sobrescrever o novo.
- Carteira relida em segundo plano quando a situação muda, sem o resumo do cabeçalho piscar.
- Os casos de teste aprovados, README e `deferred-work.md`.

**O que revisei e pedi para mudar:**
- Pedi que a spec tratasse o evento `bid` do stream, a união do lance do POST com o do stream pelo `seq`, o botão travado durante o envio e o link da auditoria só na 5.8.
- Pedi que esqueleto e erro com "Tentar de novo" fossem para `shared/ui` num commit de refatoração antes de usar, sem bloco novo com o nome da tela.
- Escolhi que o detalhe do lote informe se o licitante já deu lance, num commit próprio, e pedi os testes desse caso junto com os aprovados.
- Decidi a regra da situação: ganhando pelo último lance; superado se já deu lance e o último é de outro; senão, ainda não deu lance.
- Defini o texto da recusa por integridade: "Lances suspensos neste lote." e que o lance não foi registrado.
- Ao conferir, apontei que a sala não avisava a queda da API; pedi o aviso "Conexão perdida. Reconectando…", o botão travado e a volta sem recarregar.
- Pedi ajustes visuais na sala: no celular, o layout da 3.7 com a obra primeiro; no quadro do lance, só valor, líder e contagem, alinhados pelo topo, com a regra de prorrogação numa linha abaixo; "Sobre a obra" de volta embaixo da obra no desktop; histórico com "Ver lances anteriores" em vez de paginação numerada; e conferência por screenshots antes da entrega.
- Revi a decisão da 2.4, que deixou o cabeçalho sem o monograma: com mais itens no menu, pedi o monograma de volta, com menu no visual do site (nome, papel e Sair), links centralizados a partir de 1024px e numa segunda linha abaixo disso, carteira sempre junto do monograma, e o nome "ÁGORA" escondido só onde não cabe, medido por screenshot.

**Sugestões rejeitadas e por quê:**
- Recusei derivar a situação só dos lances carregados: quem fosse superado por mais de 20 lances veria "ainda não deu lance".
- Recusei a ordem do canvas no celular, com miniatura no cabeçalho: mantive a decidida na 3.7.
- Mudei o texto proposto para a recusa por integridade, para dizer que o lance não foi registrado.

**Erro encontrado na revisão:**
- Nada a registrar.

## Story 4.7: Destaque ao vivo e lotes comprometidos na carteira

**O que a IA gerou:**
- O fim de cada lote comprometido em `GET /wallet`, na mesma query, com teste unitário e um caso e2e.
- Modelo, stream e quadro de situação da sala movidos para `shared`, sem mudar os testes, para a página inicial reaproveitar.
- Destaque da página inicial ao vivo: lance atual, número de lances e prazo pelo único stream da página, unidos pelo `seq`.
- Quadro "Você está ganhando" ou "Você foi superado" no destaque, com a carteira relida quando a situação muda.
- Lista dos lotes comprometidos na Carteira, com número, título, situação, valor e link para a sala, e "e mais N lotes" acima de 20.
- Os casos de teste aprovados, README e `deferred-work.md`.

**O que revisei e pedi para mudar:**
- Decidi os textos da situação na Carteira: "Você lidera · encerra {data}" e, com o lote já vencido, "Você arrematou · aguardando liquidação".
- Decidi trazer o fim do lote na lista de comprometidos, num commit próprio da API, com teste unitário e um caso e2e.
- Pedi o caso de teste da linha do lote encerrado mostrando "aguardando liquidação".
- Aprovei os casos de teste da story.
- Decidi deixar a virada de status do destaque com a página aberta para depois, num item só do `deferred-work.md` junto com o achado da revisão da 3.6.
- Pedi para a nota do comprometido dizer só "reservado em N lotes", porque a contagem inclui lotes arrematados aguardando liquidação.
- Decidi manter a linha "encerra" desatualizada com a Carteira aberta depois do fim, registrada no `deferred-work.md`.
- Pedi o cabeçalho com as medidas do canvas a partir de 1024px e a barra de proporção da carteira no resumo, com teste da proporção.

**Sugestões rejeitadas e por quê:**
- Mudei a proposta da data de fim na Carteira: o lote já vencido e ainda não liquidado mostra "Você arrematou · aguardando liquidação" em vez da data.
- Mudei a proposta de um item novo no `deferred-work.md` para a virada de status do destaque: pedi um item só, junto com o achado da 3.6.

**Erro encontrado na revisão:**
- Nada a registrar.

## Story 5.1: Regras de liquidação (TDD)

**O que a IA gerou:**
- A regra pura que decide o que acontece com um lote vencido: não liquidar (com o motivo), fechar sem vencedor ou liquidar.
- Os 15 casos aprovados, escritos antes do código, em dois pares de commits de teste e implementação.
- Os movimentos de cada carteira como variações: débito e liberação do comprometido do vencedor, crédito do leiloeiro.
- A pendência da 5.2 no `deferred-work.md`: conferir o selo do lote antes de mover saldo.

**O que revisei e pedi para mudar:**
- Aprovei os 15 casos de teste da story.
- Pedi que a regra recebesse o leiloeiro do lote, para o caso do crédito no saldo dele.
- Decidi a ordem dos motivos para não liquidar: cancelado, depois já liquidado, depois ainda não terminou.
- Pedi dois casos a mais: lote cancelado e já vencido, e lote já liquidado e já vencido.
- Pedi que a 5.2 confira o selo do lote antes de mover saldo, porque apagar o último lance direto no banco mudaria quem paga.
- Na revisão, aprovei um caso 16 (lote cancelado e já liquidado responde cancelado), porque nenhum teste fixava essa parte da ordem.
- Pedi que o caso do fim prorrogado conferisse um instante antes e o instante exato.
- Decidi deixar como estão os outros achados de estilo da revisão.

**Sugestões rejeitadas e por quê:**
- Pedi para juntar os quatro testes de movimentos num só: a comparação da lista inteira, sugerida pelo Claude (app), tinha deixado os quatro idênticos.

**Erro encontrado na revisão:**
- Nada a registrar.

## Story 5.2: Liquidação e comprovante assinado na API

**O que a IA gerou:**
- A liquidação numa transação: trava o lote, confere o selo, move os saldos, grava o comprovante assinado e marca o lote como liquidado.
- A assinatura do comprovante e a verificação dela, escritas depois dos 6 casos de teste, em dois pares de commits de teste e implementação.
- A tabela de comprovantes, com um comprovante por lote e um link aleatório e único.
- O gatilho no acesso ao lote: lote vencido é liquidado ao ser aberto, e a resposta traz o resultado; o link do comprovante vai só para o vencedor.
- O aviso de encerramento no tempo real, só com o alias do vencedor e o valor.
- Seis testes de integração com banco real, três deles avisados como extras (lote sem lances, link só para o vencedor, aviso no tempo real).

**O que revisei e pedi para mudar:**
- Pedi que a liquidação conferisse o selo do lote antes de mover saldo e, com selo inválido, não liquidasse e só registrasse o motivo no log (virou a D-064).
- Pedi a mesma ordem de travas do lance, a data da liquidação lida do relógio do servidor depois da trava, e que uma falha na liquidação nunca derrubasse a página do lote.
- Pedi o link do comprovante aleatório, nunca derivado do número do lote, e o aviso de encerramento só depois de gravar, com alias e valor.
- Aprovei os 5 casos de teste da assinatura e pedi um sexto, conferindo com uma assinatura montada à mão, para fixar o formato.
- Pedi três testes com banco real: dois acessos simultâneos liquidando uma vez só, cobrança pelo último lance mesmo com o lance atual alterado no banco, e selo inválido sem liquidar.
- Na revisão, aprovei três testes novos: falha na liquidação sem derrubar a página, uma query só fora do lote vencido, e os acessos que não liquidam.
- Pedi que o link do comprovante fosse entregue pelo id do vencedor, gravado no comprovante, com um teste de dois licitantes de mesmo alias.
- Pedi para juntar o cálculo do selo num lugar só, registrar no README as duas limitações aceitas e deixar os demais ajustes de estilo como estavam.

**Sugestões rejeitadas e por quê:**
- Reconhecer o vencedor comparando aliases: recusei, porque dois licitantes do mesmo lote podem ter o mesmo alias e o link iria para a pessoa errada.

**Erro encontrado na revisão:**
- Nada a registrar.

## Story 5.3: Timer de liquidação em memória

**O que a IA gerou:**
- Um timer único em memória que, ao subir a API, liquida os lotes vencidos e se arma para o próximo fim, sem job periódico.
- O recálculo do timer depois de cada lance aceito e de cada lote criado, sem atrasar a resposta.
- O tratamento do limite do relógio do Node: lote que termina daqui a mais de 24 dias dispara no limite e reagenda o resto.
- As duas consultas do timer (lotes vencidos e próximo fim) junto da liquidação.
- Quinze testes unitários com relógio falso (três deles cobrindo falhas de agendamento achadas na revisão) e cinco testes de integração com banco real.

**O que revisei e pedi para mudar:**
- Pedi que o timer só aponte para lotes com fim no futuro, com um teste provando que um lote que não liquida (selo inválido) não faz o timer disparar em laço.
- Pedi que todo disparo registre o erro no log, sem nenhuma Promise sem tratamento.
- Pedi que o timer seja limpo quando o módulo é destruído, para os testes de integração não ficarem pendurados.
- Pedi o recálculo depois do commit do lance e da criação de lote, sem dependência circular entre os módulos.
- Pedi que o timer não liquide lotes no meio dos testes de integração; aprovei desligá-lo lá, trocando por um falso que só conta os recálculos.
- Aprovei os 16 casos de teste propostos e pedi um a mais: erro ao liquidar no boot vai para o log e a API termina de subir com o timer armado.
- Aprovei o recálculo por substituição, em que só vale o pedido mais recente, e as consultas do timer no serviço de liquidação.
- Recusei adiar a falha da consulta do próximo fim: pedi registrar no log e tentar de novo a cada 30 s até conseguir, com um teste em que a primeira consulta falha e a segunda arma o timer.

**Sugestões rejeitadas e por quê:**
- Deixar para depois a nova tentativa quando a consulta do próximo fim falha: recusei, porque sem ela o timer para até o próximo lance ou lote criado.

**Erro encontrado na revisão:**
- Nada a registrar.

## Story 5.4: Comprovante, meus lances e resultado do painel na API

**O que a IA gerou:**
- A rota pública do comprovante, que confere a assinatura a cada consulta e mostra o comprovante adulterado como inválido, sem escondê-lo.
- A recusa de link de comprovante malformado antes de consultar o banco.
- A rota Meus lances, com as seções em andamento, arrematados e não arrematados, paginadas e com a contagem de cada uma, em duas consultas.
- O total recebido e o resultado de cada lote encerrado no painel do leiloeiro, sem consulta a mais.
- Os tipos novos no front, sete testes unitários e dezessete testes de integração com banco real.

**O que revisei e pedi para mudar:**
- Pedi que arrematados e não arrematados reconheçam o vencedor pelo id gravado no comprovante, nunca pelo alias.
- Pedi que lote encerrado e ainda não liquidado fique em "em andamento", marcado como aguardando liquidação, para nenhum lote sumir das três seções.
- Pedi que a situação (ganhando ou superado) venha do dono do último lance, calculada na API.
- Pedi que o comprovante adulterado continue aparecendo, marcado como inválido, e que link com formato impossível dê 404 sem consultar o banco.
- Pedi que nenhuma resposta traga id, nome ou e-mail de usuário.
- Pedi a conferência do índice com EXPLAIN e do número fixo de consultas por rota.
- Pedi testes de integração das três seções, com o lote aguardando liquidação, e do comprovante adulterado no banco.
- Aprovei a spec, com os 17 casos de teste propostos pelo agente, sem parar para revisá-la.

**Sugestões rejeitadas e por quê:**
- Nada a registrar.

**Erro encontrado na revisão:**
- Nada a registrar.

## Story 5.5: Auditoria da cadeia na API (TDD)

**O que a IA gerou:**
- A verificação da cadeia de lances, do selo do lote e do comprovante, escrita depois dos testes, que falharam primeiro.
- O indicador por lance: íntegro antes do primeiro lance quebrado, adulterado nele e não verificável depois.
- A rota pública de auditoria do lote, com aliases e sem dado pessoal, em duas consultas para qualquer número de lances.
- A rota que leva do número do lote ao id, sem lotes cancelados.
- A separação da função de assinatura num arquivo próprio, para a verificação conferir o comprovante sem import circular.
- A explicação da técnica de auditoria no README, os tipos novos no front e os testes unitários e de integração com banco real.

**O que revisei e pedi para mudar:**
- Aprovei os 12 casos de teste propostos e pedi mais quatro: lance com seq maior que 1 apontando para o início da cadeia, selo nulo, comprovante com hash final diferente e comprovante com assinatura inválida.
- Pedi o indicador por lance: íntegro antes do primeiro quebrado, adulterado nele e não verificável nos seguintes.
- Pedi que cada lance apareça com o alias calculado do licitante, sem id, nome ou e-mail, e testes de integração que alterem o banco direto (valor, último lance apagado, hash final do comprovante).
- Escolhi um quarto resultado para comprovante adulterado, com prioridade menor que lance quebrado e lances removidos do fim.
- Decidi que lote liquidado com lances e sem comprovante é adulterado, pedi o caso do lote liquidado sem lances, que continua íntegro, e aprovei que o selo nulo conte como lances removidos do fim.
- Depois da revisão, decidi que comprovante em lote não liquidado ou em lote liquidado sem lances também é adulterado (dois casos novos) e aprovei os três testes extras do agente.
- Decidi registrar a lista completa de lances na auditoria como exceção à paginação, porque a verificação depende da cadeia inteira.
- Pedi que a auditoria ganhasse um item próprio nos testes do README e uma linha dizendo que consultar a auditoria não liquida o lote.

**Sugestões rejeitadas e por quê:**
- Comparar o alias e o valor do comprovante com o último lance: recusei, porque a assinatura já cobre os dois e forjá-la exige o segredo.

**Erro encontrado na revisão:**
- O lote e os lances eram lidos em instantes diferentes do banco: um lance chegando entre as duas leituras fazia um lote íntegro parecer adulterado. Agora as duas leituras veem o mesmo instante.

## Story 5.6: Sala encerrada e tela Comprovante de arremate

**O que a IA gerou:**
- O resultado na sala encerrada: "Você arrematou este lote" com o valor debitado e o link do comprovante para o vencedor, e o vencedor com o valor, ou "sem lances", para os demais.
- A releitura da carteira do cabeçalho quando o lote encerra com a sala aberta, e a releitura do lote quando chega o aviso de encerramento do stream.
- A tela pública do comprovante, seguindo o canvas: dados do arremate, imagem, selo válido ou inválido, código de verificação abreviado e cópia do código e do link, com cópia manual quando o navegador recusa.
- A separação do nicho da obra e da tela de "não encontrado" em componentes compartilhados, usados pela sala e pelo comprovante.
- Testes do resultado da sala, da data por extenso, do código abreviado, da cópia manual e do comprovante não encontrado.
- Na conferência por capturas, a correção de uma colisão de nome entre o nicho compartilhado e o da vitrine, que deixava a imagem do comprovante achatada, e os ajustes de quebra e de espaço em 360, 768 e 1280px.

**O que revisei e pedi para mudar:**
- Pedi que o resultado venha da releitura do lote que a sala já faz na virada, e que lote encerrado sem resultado mostre "Lote encerrado, aguardando liquidação".
- Pedi "Você arrematou" com o valor e o link do comprovante para o vencedor, com a carteira do cabeçalho relida, e o alias do vencedor com o valor, ou "sem lances", para os demais.
- Decidi deixar para depois o link da auditoria no comprovante e na sala (5.8), as sugestões de termos na busca do acervo (polimento), a caixa de contas de demonstração na tela Entrar e a composição do seed, com um lote adulterado de propósito e um roteiro de adulteração no README (6.1).
- Pedi que os botões de copiar mostrem o texto selecionado para cópia manual quando a área de transferência falhar.
- Pedi que o comprovante inválido mostre todos os dados, com o selo "Comprovante inválido", e valores com centavos, datas no fuso do navegador e o número do lote com romano.
- Pedi a conferência visual: canvas e site lado a lado em 1280px, capturas em 360, 768, 1024 e 1280px, e reaproveitamento do que já existe em comum, sem bloco novo com o prefixo da tela.
- Na conferência, pedi a frase de lote pendente uma vez só, a marca "Arrematou" ou "Último lance" no histórico do lote encerrado e as grades de cartões com no máximo 4 colunas, para as páginas de 12 sempre fecharem a linha.
- Antes do merge, pedi que "Você arrematou" dependa só do token do comprovante, que a API envia apenas ao vencedor, e não do alias; e que o comprovante válido diga que só a assinatura confere, indicando a auditoria para o histórico de lances.

**Sugestões rejeitadas e por quê:**
- Nada a registrar.

**Erro encontrado na revisão:**
- Nada a registrar.

## Story 5.7: Tela Meus lances e resultado no painel

**O que a IA gerou:**
- A tela Meus lances, só para licitante, com as abas Em andamento, Arrematados e Não arrematados, a contagem de cada uma, paginação e cada lote numa placa com selo, valores e ações.
- Em andamento: situação, lance atual, o seu lance, contagem regressiva e o botão de cobrir o lance ou abrir a sala; lote vencido sem liquidar aparece como aguardando liquidação.
- Arrematados em placas com imagem, valor pago, data, link do comprovante e cópia do link; Não arrematados com o valor final e o seu maior lance.
- O artista nos itens de Meus lances, na API.
- No painel, o cartão "Total recebido" e o resultado de cada lote encerrado, com o link do comprovante quando arrematado.
- As abas e a cópia de link como componentes compartilhados, usados pelo comprovante e por Meus lances.
- Testes da situação, do tempo, da ação e do valor final em Meus lances e do resultado no painel.

**O que revisei e pedi para mudar:**
- Pedi as três seções em abas, com um componente de abas compartilhado que as outras telas vão usar depois.
- Pedi que o botão de copiar o link do comprovante fosse reaproveitado, com cópia manual quando a área de transferência falhar.
- Defini os textos do lote vencido sem liquidar ("Encerrado, aguardando liquidação" e "Você arrematou · aguardando liquidação") e o traço para valor final ausente.
- Decidi incluir o artista na resposta de Meus lances, para a tela ficar como o desenho.
- Decidi mostrar "Abrir sala" nos não arrematados e deixar o link de auditoria para a 5.8.
- Pedi o cartão "Total recebido" no painel e o resultado de cada lote encerrado no livro.
- Pedi a comparação com o desenho em 1280px e a conferência em 360, 768, 1024 e 1280px.
- Pedi, na conferência, a placa de Arrematados nas três abas no lugar das tabelas, um subtítulo novo, valores sem versalete e botões de ação do mesmo tamanho.

**Sugestões rejeitadas e por quê:**
- Rótulo "Você lidera" na situação: escolhi "Você está ganhando", o mesmo da sala e do destaque da página inicial.
- Nota "em N lotes arrematados" no total recebido: um lote vencido e ainda não liquidado entraria na contagem sem estar no total, então a nota diz só "soma dos comprovantes dos lotes arrematados".

**Erro encontrado na revisão:**
- Nada a registrar.

## Story 5.8: Tela Auditoria do lote e campo da página inicial

**O que a IA gerou:**
- A tela pública da auditoria, com o veredito (Íntegro ou Adulterado) em linguagem simples, o botão de verificar de novo e a lista de todos os lances com alias, valor, horário, código e verificação de cada um.
- Os quatro resultados: histórico íntegro, lance alterado (com o ponto exato e os lances seguintes como não verificáveis), lances removidos do fim e comprovante que não confere.
- O bloco "Leilões que qualquer pessoa pode conferir" na página inicial, com o campo do número do lote em algarismos ou romano.
- Os links "Auditar este lote" na vitrine, no destaque, na sala, no comprovante e em Meus lances, e os itens Como funciona e Auditoria no cabeçalho, que rolam até a seção.
- O artista na resposta da auditoria, na API.
- A cópia do código como bloco compartilhado entre o comprovante e a auditoria.
- Testes do veredito, da marcação de cada lance e da leitura do número do lote.

**O que revisei e pedi para mudar:**
- Pedi os quatro resultados da auditoria, cada um com selo e explicação simples, e o indicador de cada lance (íntegro, adulterado ou não verificável).
- Pedi o link para a seção Auditoria do README na explicação e a cópia do código como bloco compartilhado com o comprovante.
- Pedi que o campo da página inicial aceitasse "7", "VII" ou "vii" e mostrasse "lote não encontrado" junto do campo.
- Pedi o link "Auditar este lote" na sala, no comprovante, na vitrine, no destaque e em Meus lances, com o do card acima da área que abre a sala.
- Pedi o cabeçalho na ordem do desenho, com Como funciona e Auditoria rolando até a seção também vindo de outra página.
- Decidi incluir o artista na resposta da auditoria.
- Decidi não pôr link para o comprovante na auditoria: o token só chega ao vencedor e ao leiloeiro, e o vencedor decide com quem compartilhar.
- Pedi, antes do push, a rolagem até a seção uma vez só, o veredito mantido quando a nova verificação falha, os códigos escondidos por padrão com a frase para guardar o último código e o menu do celular sem rolagem a partir de 360px.

**Sugestões rejeitadas e por quê:**
- Devolver o token do comprovante na auditoria para mostrar o link a qualquer pessoa: recusei, para o vencedor continuar decidindo quem vê o comprovante.

**Erro encontrado na revisão:**
- O passo 2 da auditoria dizia que o selo do lote nascia no encerramento, mas ele é gravado a cada lance.
- O espaço que não quebra linha antes do horário no comprovante tinha virado um caractere invisível no código na refatoração; voltou a ser escrito de forma explícita.

## Story 6.1: Seed idempotente e compose verificado

**O que a IA gerou:**
- O replanejamento do épico 6 nos documentos de planejamento e no controle das stories.
- O relógio da aplicação como peça única, que o seed consegue adiantar ou atrasar.
- O seed com três contas, onze lotes de obras do museu e lances passando pelo mesmo caminho do site, incluindo lotes que aconteceram no passado e um lote adulterado de propósito.
- A retomada: rodar de novo completa o que faltou sem duplicar nada.
- O bloco "Contas de demonstração" na tela Entrar.
- O roteiro de teste, a seção "Testar a adulteração você mesmo" e o comando do seed em produção no README.
- Testes do seed contra um banco de verdade.

**O que revisei e pedi para mudar:**
- Decidi o épico 6 com sete stories, a saída do Swagger e o cancelamento com estorno como story própria.
- Aprovei liquidar os lotes do passado 1 minuto depois do fim e pedi o teste de adulteração do README só nos lotes encerrados, para os ao vivo continuarem aceitando lances.
- Pedi a composição do seed: um leiloeiro, dois licitantes, quatro lotes ao vivo, dois agendados, três encerrados, um cancelado e um adulterado.
- Escolhi as contas leiloeiro, Geovanna e Felipe, todas com a senha Agora2026!.
- Pedi que o seed exija o segredo de assinatura e o endereço do banco explícitos fora do compose, com um teste para o segredo ausente.
- Decidi as datas: lotes ao vivo encerrando entre 7 e 10 dias depois do seed e agendados abrindo entre 5 e 6 dias (D-069).
- Pedi o desenho do bloco de contas de demonstração: linha dourada, título em versalete, três botões com nome e papel, foco no botão Entrar e a linha com a senha; depois, o nome Casa Ágora para o leiloeiro.
- Pedi para tirar o teste do botão de conta de demonstração, que percorria a tela à mão para conferir um clique simples; os screenshots já mostram o comportamento.

**Sugestões rejeitadas e por quê:**
- Lote ao vivo terminando em cerca de 30 dias: troquei por 7 a 10 dias, porque os lotes só precisam ficar abertos nos dias seguintes à entrega (D-069).
- Nomes Ana e Bia para os licitantes: troquei por Geovanna e Felipe.
- Teste do botão de conta de demonstração que percorria a tela à mão: recusei, porque conferia um clique simples e os screenshots já cobrem.

**Erro encontrado na revisão:**
- Um lote do passado já liquidado podia receber os lances que faltavam numa segunda execução; agora o seed não dá lance em lote liquidado.

## Story 6.2: Consistência da API

**O que a IA gerou:**
- A arrumação da API: um lugar só para regras e utilidades que estavam copiadas em vários módulos.
- Nomes num padrão só (assinaturas, painel, eventos do tempo real, funções de teste) e comentários sem referência a story.
- O registro das consultas ao banco em desenvolvimento, para conferir quantas cada tela dispara.
- O limite de 5 tentativas de login por minuto para cada endereço, com a mensagem na tela Entrar.
- Os testes do limite, escritos antes do código, e a decisão registrada.

**O que revisei e pedi para mudar:**
- Pedi os treze pontos da arrumação da API, um a um, e o que não podia ser mexido.
- Pedi o limite de tentativas só no login, com a resposta no formato da API e a mensagem "Muitas tentativas. Aguarde um minuto e tente de novo.".
- Decidi que o endereço vem do cabeçalho da Cloudflare quando existir, porque atrás dela o endereço visto pelo servidor é compartilhado por muitos usuários.
- Pedi o teste de que dois endereços diferentes não dividem o limite e de que, sem o cabeçalho, conta o endereço da conexão.
- Aprovei o mesmo teto de 100 páginas em todas as listagens, inclusive o histórico de lances.
- Aprovei o prefixo único do painel, o limite próprio nos testes de integração e a opção de ligar o registro de consultas.

**Sugestões rejeitadas e por quê:**
- Contar o limite pelo endereço visto pelo servidor atrás do proxy: troquei pelo cabeçalho da Cloudflare, para um usuário não bloquear o login de todos.

**Erro encontrado na revisão:**
- Um cabeçalho da Cloudflare vazio faria todos esses clientes dividirem o mesmo limite; agora o vazio cai no endereço da conexão.

## Story 6.3: Consistência do front

**O que a IA gerou:**
- Peças únicas compartilhadas para o selo de status, a contagem regressiva e as abas, usadas em todas as telas que repetiam o mesmo desenho.
- Os esqueletos de carregamento da carteira e do painel no mesmo padrão das outras telas.
- Um lugar só para as datas, os limites (como o maior número de lote) e a leitura do número do lote digitado.
- A checagem de "não encontrado" e o formato dos estados de carregamento num lugar só.
- A limpeza da folha de estilos do design system e dos comentários fora do padrão.
- Os dados de teste repetidos num arquivo compartilhado, com aliases no formato real.
- Comparação por screenshots antes e depois da vitrine, do painel e de Meus lances.

**O que revisei e pedi para mudar:**
- Defini os 13 itens da story: o que unificar, onde, e que nada de comportamento ou visual mudasse além das abas.
- Pedi screenshots antes e depois em 1280 e 360px para as abas da vitrine e do painel.
- Decidi que a mensagem de lote não encontrado use o mesmo rótulo de lote das outras telas.
- Pedi que nenhuma tela importe código de dentro de outra tela.
- Pedi para não renomear classes de estilo em massa.
- Aprovei a spec como estava, inclusive a saída dos ganchos da carteira para a pasta compartilhada.

**Sugestões rejeitadas e por quê:**
- Nada a registrar.

**Erro encontrado na revisão:**
- Nada a registrar.

## Story 6.4: Documentação

**O que a IA gerou:**
- A revisão de `docs/` e do `CLAUDE.md` conferida no código: telas no estado final, códigos de erro, seed e estrutura de pastas.
- O índice das decisões, com número, título, status e story, e o mesmo formato de cabeçalho em todas as entradas.
- O formato único deste log: quatro seções na mesma ordem, no máximo 8 itens por seção e "alias" como termo único.
- O mapa de `docs/` num README próprio, a spec da 1.1 no padrão das outras e o controle das stories com os status reais.

**O que revisei e pedi para mudar:**
- Pedi o índice no topo do `decisions.md` e um formato só de cabeçalho, com status `Aceita`, `Substituída por` ou `Parcialmente substituída por`.
- Pedi que as justificativas das decisões trouxessem o motivo técnico ou de prazo.
- Decidi registrar os prazos dos lotes do seed, decididos na 6.1, como nova decisão que substitui parte da D-020 (D-069).
- Pedi neste log as seções sempre na mesma ordem, com "Erro encontrado na revisão" por último, e as entradas com mais de 8 itens enxugadas, sem perder decisão.
- Pedi no Resumo um item só para o que eu decido e não delego, e a lista de testes descrita como proposta da IA que eu aprovo, corto ou completo.
- Pedi o mapa de `docs/`, com uma linha só sobre as referências do Claude Design, sem README dentro de `docs/design/`.
- Decidi não mexer no README, no `deferred-work.md` nem no `deploy-notes.md` nesta story.

**Sugestões rejeitadas e por quê:**
- README próprio dentro de `docs/design/`: recusei; a linha sobre os desenhos fica só no mapa de `docs/`.

**Erro encontrado na revisão:**
- Nada a registrar.

## Story 6.5: Cancelamento com estorno

**O que a IA gerou:**
- A regra do cancelamento, com o teste antes: lote agendado ou ao vivo cancela e devolve o valor do último lance a quem o deu; lote encerrado é recusado.
- O cancelamento na API, numa operação só: trava o lote, confere se ele já encerrou e se o selo bate, trava a carteira de quem está ganhando, devolve o saldo comprometido e marca o lote como cancelado; o aviso ao vivo sai depois de gravar.
- A saída do lote cancelado da carteira e de "Em andamento", a entrada em "Não arrematados" e a auditoria acessível pelo link direto.
- Na sala, o aviso de cancelamento com o formulário escondido e a contagem parada; no painel, o botão de cancelar também em lote com lances, com o aviso na confirmação.
- Testes da regra, do serviço, do aviso ao vivo e de integração contra um banco de verdade.
- A atualização sobre as stories 6.2, 6.3 e 6.4, usando as peças compartilhadas que elas criaram.

**O que revisei e pedi para mudar:**
- Pedi o cancelamento de lote ao vivo com lances, com o saldo de quem está ganhando devolvido na mesma operação e os lances mantidos na auditoria; lote encerrado continua sem cancelamento.
- Decidi que o lote cancelado sai de "Em andamento" e vai para "Não arrematados", com o selo "Cancelado", o maior lance, a data do cancelamento e só o botão de auditar.
- Decidi que a auditoria do lote cancelado continua pelo link direto, com o selo "Cancelado", e que a busca por número continua sem achá-lo.
- Decidi que o cancelamento confere o selo do lote e recusa quando ele não bate, como o lance e a liquidação.
- Defini os casos de teste e as mensagens da sala, e pedi quatro casos a mais na integração: a liquidação não age no lote cancelado, lance depois do cancelamento não grava nada, o lote nunca aparece em "Arrematados" e o painel não muda o total recebido.
- Aprovei trocar o texto da confirmação do painel, que dizia que os lances seriam cancelados, pela versão sugerida pelo agente, porque os lances continuam na auditoria.
- Pedi para ajustar no CLAUDE.md as linhas que ainda descreviam o cancelamento só sem lances, o estorno como fora do escopo e o código de erro que deixou de existir.
- Na atualização sobre as outras stories, pedi para reaproveitar as peças delas (busca do último lance, status com cancelamento no painel e na auditoria, selo de status) e para somar a devolução do saldo no banco, como na liquidação.

**Sugestões rejeitadas e por quê:**
- Nada a registrar.

**Erro encontrado na revisão:**
- A contagem regressiva continuava correndo na sala depois do cancelamento; agora para.
- Um lance enviado no instante do cancelamento trocava o aviso pela tela de lote não encontrado; agora o aviso fica.
- O teste da devolução não distinguia devolver só o valor do lance de zerar todo o saldo comprometido; agora distingue.

## Story 6.6: Polimento final

**O que a IA gerou:**
- A posição do licitante na sala ("Seu maior lance · 2º de 3 licitantes"), com a regra escrita depois do teste, calculada pelo maior lance de cada um e atualizada a cada lance novo.
- O rodapé em todas as telas e o menu do cabeçalho em duas linhas no celular.
- No painel: a ficha do lote aparece e recebe o foco ao escolher a obra, sugestões de busca por departamento, imagens do acervo com fade, título do lote como link para a sala e selo e botão do tamanho do conteúdo no modo cartão.
- As contas de demonstração numa caixa que abre, os atalhos de valor da sala numa linha só e o tempo restante em dias e horas acima de 48 h.
- A correção da imagem em cache: o endereço da imagem passa a levar a obra, para o banco recriado nunca mostrar a imagem de outra peça.
- O novo teto por depósito, nos dois lados, com testes.

**O que revisei e pedi para mudar:**
- Defini a lista de itens da story: rodapé, posição do licitante, os ajustes do painel, menu do cabeçalho, contas de demonstração, atalhos da sala, tempo em dias, fade das imagens e o bug do cache da imagem.
- Defini os casos de teste da posição, o caso de integração do licitante superado e os casos da divisão do tempo e do endereço da imagem.
- Escolhi os termos de sugestão de cada departamento, conferidos no acervo.
- Pedi o crédito "Imagens das obras: Cleveland Museum of Art." no rodapé.
- Detalhei o visual da caixa de contas de demonstração: fechada numa linha, aberta no estilo dos cartões, uma linha por conta.
- Pedi uma função só para dividir e formatar o tempo restante na sala, no destaque, nos cards e em Meus lances.
- Decidi subir o teto por depósito para R$ 10.000.000,00, sem mudar o teto do saldo.

**Sugestões rejeitadas e por quê:**
- Nada a registrar.

**Erro encontrado na revisão:**
- Nada a registrar.
