# Uso de IA

Registro de onde e como usei IA no projeto, o que revisei e pedi para mudar e o que rejeitei. Uma entrada por story, mais esta de planejamento.

## Ferramentas

- **Claude (app):** apoio de pesquisa e consulta durante o planejamento e na revisão das propostas do agente, junto com buscas no Google e na documentação oficial. As decisões registradas em "O que revisei e pedi para mudar" foram minhas.
- **Claude Code:** implementação e commits. Todo commit feito por ele leva o trailer `Co-Authored-By`, então dá para ver no histórico do Git o que passou pela IA.

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
- *Regras extras de lint (`no-explicit-any`, `no-floating-promises`):* fiquei com o padrão do Nest mais o limite de complexidade.
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
