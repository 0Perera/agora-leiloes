# Uso de IA

Registro de onde e como usei IA no projeto, o que revisei ou mudei e o que rejeitei. Uma entrada por story, mais esta de planejamento.

## Ferramentas

- **Claude (app):** planejamento, pesquisa de APIs e hospedagem, comparação de alternativas, redação do `CLAUDE.md` e do `docs/decisions.md`.
- **Claude Code:** implementação e commits. Todo commit feito por ele leva o trailer `Co-Authored-By`, então dá para ver no histórico do Git o que passou pela IA.

## Modelo de entrada

```
## Story X.Y: título

**O que a IA gerou:**
**O que revisei ou reescrevi:**
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

**O que revisei ou mudei:**
- No começo, a IA saiu definindo stack e cronograma inteiros. Parei e passei a decidir item por item. A única coisa fixa desde o início era o NestJS.
- O tema começou como cartas de TCG. Pedi que a IA me mostrasse qual API pública era mais confiável para realizar o projeto. Com base na comparação, escolhi a do Cleveland Museum of Art e mudei o tema para obras de arte.
- Corrigi a direção visual: arte clássica europeia (mármore, estátuas, museus clássicos), e não contemporânea.
- Testei a API da Cleveland na minha máquina. A checagem da IA pela web devolvia resposta em cache e não servia como prova. Duas chamadas travaram; rodei um loop de diagnóstico, e todas voltaram 200 em menos de 1s.
- Perguntei se TDD valia o custo em tokens e tempo. Ficou TDD só nas regras críticas.
- Achei que o alias no SSE parecia gambiarra e pedi a comparação com WebSocket. Mantive o SSE por causa do prazo, sabendo o que perderia.
- Exigi que as imagens fossem baixadas e guardadas, porque o enunciado pede que tudo funcione com a API fora do ar.
- Troquei o Neon pelo Postgres do Render. A IA tinha recomendado o Neon porque o free do Render expira em 30 dias, mas o Elite Dev avalia em até 4 dias após a entrega. Vou recriar o banco no dia da entrega, para os 30 dias cobrirem o processo inteiro.
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

**O que revisei ou reescrevi:**
- Decidi rodar as migrations no boot (`migrationsRun`) em vez de no start command (D-031).
- O Nest CLI atual gerou Vitest, oxlint e ESM. Mandei fixar o CLI 11 e instalar só versões das libs `@nestjs/*` compatíveis com o Nest 11, conferindo o `peerDependencies` antes do commit (D-032).
- Fiz o commit inicial direto na `main`; daí em diante, branch por story.
- O template do Vite também trocou ESLint por oxlint. Mantive o oxlint, com as mesmas duas regras da API (D-033).
- Pedi o deploy via Blueprint, ainda no plano free, na região Virginia (D-034). A IA conferiu os campos do `render.yaml` na documentação do Render (`staticPublishPath` relativo ao `rootDir`, sintaxe de `routes`).
- Pedi para trazer o compose completo (D-030) para esta story. A IA avisou que estava fora do escopo escrito; decidi incluir, com o front em nginx (D-035).
- Na revisão final pedida por mim, a IA achou um bug que ela mesma tinha introduzido: o ajuste do `tsconfig` para o TS 6 tirou o cache incremental da `dist` e quebrou o `start:dev`. Corrigido, com um segundo build no CI para pegar a regressão.
- Pedi Prettier no front, com a mesma config da API, e `strictPropertyInitialization` ligado, para ficar coerente com o `!` exigido nas entidades.

**Sugestões rejeitadas e por quê:**
- *Aceitar o template do Nest 12:* contrariava as decisões de testes e lint já tomadas.
