# Epic 6 Context: Entrega

<!-- Compilado dos artefatos de planejamento. Edite à vontade. Gere de novo com compile-epic-context se os docs de planejamento mudarem. -->

## Goal

Deixar o Ágora pronto para o avaliador: dados de demonstração confiáveis, local e no deploy, criados pelos mesmos fluxos da aplicação (para a auditoria e o comprovante saírem válidos); `docker compose up` funcionando num checkout limpo; API e front revisados para seguir um padrão só; `docs/` atualizado; arestas visuais resolvidas; e um README que permite rodar, testar e entender o sistema sem ler o código. Não há funcionalidade nova: o épico consolida e entrega o que os épicos 1 a 5 construíram.

## Stories

- Story 6.1: Seed idempotente e compose verificado
- Story 6.2: Consistência da API
- Story 6.3: Consistência do front
- Story 6.4: Documentação
- Story 6.5: Cancelamento com estorno
- Story 6.6: Polimento final
- Story 6.7: README final

## Requirements & Constraints

- Seed cria um leiloeiro, dois licitantes com saldo depositado e lotes pelo fluxo do leiloeiro, com ao menos um lote ao vivo terminando em ~30 dias e lances dos dois licitantes passando pelo motor de lances. Também roda no deploy.
- O seed também cria um lote encerrado e liquidado, para comprovante, aba Encerrados do painel e total recebido aparecerem no primeiro acesso. Auditoria dos dois lotes dá `intact`; o comprovante abre como válido.
- Seed idempotente, identificado pelos e-mails do seed: rodar de novo termina sem erro e sem duplicar usuários, lotes ou lances.
- Cleveland fora do ar: o seed falha com mensagem clara, sem deixar dado pela metade, e pode ser rodado de novo.
- Num checkout limpo, `docker compose up` sobe banco, API e web; as migrations rodam no boot e o comando do seed documentado funciona contra o banco do compose.
- Credenciais do seed no README; passo a passo do dia da entrega em `docs/deploy-notes.md`. Nada no código pode depender de dados criados antes da recriação do banco.
- Consistência (6.2, 6.3): os itens concretos e os casos de teste são definidos pelo usuário na abertura de cada story. Mudança de contrato da API atualiza `web/src/shared/api/types.ts`. Lint, unitários, e2e e build passam.
- README (≤ 300 linhas, checado no CI) com as seções fixas e a ordem do `CLAUDE.md`. "Fora do escopo" declara Swagger, tema escuro e limite de tentativas no login. O conteúdo de `docs/deploy-notes.md` é absorvido pelo README e o arquivo é apagado. A seção Auditoria explica alteração, remoção do meio, remoção do fim, inserção e a limitação de restaurar lote e lances inteiros. "Comportamentos esperados" traz uma linha com o porquê para: anti-sniping, cold start, liquidação no acesso e no timer, cards sem tempo real, saldo do leiloeiro, JWT de 8h sem refresh, eventos em memória numa instância, banco recriado na entrega.
- Nenhum link quebrado no README nem em `docs/`; `docs/ai-log.md` com a entrada de cada story, no estilo do `CLAUDE.md`.

## Technical Decisions

- Seed em `api/src/seed/`, sobe o contexto do Nest e usa os services da aplicação: cadastro, depósito, criação de lote (com download real da imagem) e lance. Nunca `INSERT` direto: a cadeia de HMAC, o selo e a assinatura do comprovante ficariam inválidos. Nenhuma imagem versionada no repositório (D-020).
- Lote encerrado do seed (D-045): o `Clock` é trocado por um deslocado para o passado enquanto se criam o lote e os lances, sempre pelos services; depois volta ao relógio real e o lote é liquidado pelo service de liquidação. O `Clock` precisa ser trocável no contexto do seed, e a liquidação funciona fora de uma requisição HTTP.
- Selo divergente ou nulo bloqueia lance e liquidação (D-059, D-064): o lote do seed só fica íntegro se criado inteiramente pelos services.
- Lotes do seed exigem peça que ainda não esteja num lote agendado ou ao vivo (`ARTWORK_ALREADY_LISTED`, D-051), o que pesa na idempotência.
- Migrations rodam no boot da API (`migrationsRun: true`, D-031); o seed, ao subir o contexto do Nest, também as aplica.
- Compose (D-030, D-035): Dockerfiles em `api/` e `web/` servem só ao compose; front no container é o build do Vite servido por nginx com fallback para `index.html`; `VITE_API_URL` é argumento de build. Mudança de código exige `docker compose up --build`. O Render roda Node direto.
- Deploy pelo Blueprint `render.yaml` (D-034), banco no Postgres free do Render recriado no dia da entrega (D-027). Seed em produção roda da máquina local com a External Database URL, `DB_SSL=true` e exatamente o mesmo `BID_HMAC_SECRET` do Render; segredo diferente faz a auditoria acusar adulteração, e o segredo nunca muda depois do seed.
- Testes e2e usam catálogo falso (D-060) e um container com `reset()` por suíte (D-061); o download real fica coberto pelos unitários.
- Decisões novas do épico seguem o fluxo do `decisions.md` (propor opções, registrar só depois da escolha do usuário).

## UX & Interaction Patterns

- 6.3: esqueleto de carregamento, estado de erro com "Tentar de novo" e abas viram componentes únicos em `shared/ui`; um padrão único de chamada à API (hoje há telas com hook e telas chamando a API no componente); tipografia e espaçamentos fluidos com `clamp()` pelos tokens. Conferir em 360, 768, 1024, 1280 e 1920px, sem rolagem horizontal.
- 6.5: cancelamento de lote com lances, com estorno do comprometido de quem lidera na mesma transação (lock do lote e das carteiras); lances continuam na cadeia, auditoria íntegra. Escopo e casos definidos na abertura.
- 6.6: itens da seção "Polimento visual" de `docs/stories/deferred-work.md`, cada um feito ou declarado fora do escopo; telas tocadas conferidas em 360, 768, 1024 e 1280px.

## Cross-Story Dependencies

- 6.1 depende dos services dos épicos 2 a 5 (cadastro, carteira, criação de lote, motor de lances, liquidação, comprovante, auditoria).
- 6.7 consome as credenciais do seed (6.1), o passo a passo de `deploy-notes.md` (6.1 e 6.4) e os itens "Fora do escopo" de `deferred-work.md`; deve vir por último para refletir o sistema entregue.
- 6.2 e 6.3 podem mexer em contratos e telas que 6.5, 6.6 e 6.7 descrevem; 6.4 revisa `docs/` depois das mudanças de código.
