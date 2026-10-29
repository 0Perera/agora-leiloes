# Documentação

Mapa de `docs/`. A porta de entrada do projeto é o [README da raiz](../README.md); as regras de trabalho estão no [CLAUDE.md](../CLAUDE.md).

- [decisions.md](decisions.md): decisões com alternativa real (D-NNN), com índice, status e story. Vale ler para saber por que algo é como é.
- [ai-log.md](ai-log.md): uso de IA por story: o que a IA gerou, o que revisei e pedi para mudar, o que rejeitei e os erros achados na revisão. O Resumo do topo basta para uma visão geral.
- [screens.md](screens.md): inventário funcional das telas (dados, ações, estados e textos de erro). Vale ler antes de mexer numa tela.
- [desenvolvimento.md](desenvolvimento.md): hot reload, migrations, seed fora do compose, topologia no Render, limitações do plano free e armadilhas de configuração.
- [planning/epics.md](planning/epics.md): requisitos, épicos e stories com critérios de aceite. Vale ler para ver o escopo de uma story.
- [stories/](stories/): specs das stories (`spec-<épico>-<story>-<slug>.md`), contexto compilado de cada épico (`epic-N-context.md`), pendências registradas para depois ([deferred-work.md](stories/deferred-work.md)) e o status do sprint ([sprint-status.yaml](stories/sprint-status.yaml)). Specs e contextos são gerados pelo processo de stories (BMAD), por isso têm títulos de seção em inglês e campos da ferramenta no cabeçalho; ficam como registro do que foi pedido em cada story e não são atualizados depois.
- [assets/](assets/): imagens do README (banner, mockups da página inicial, print da auditoria adulterada e diagramas do fluxo do lance e do modelo de dados); os prints saem de `scripts/screenshots.mjs`.
- [design/](design/): referências visuais exportadas do Claude Design (`*.dc.html` e os tokens em `ds/`); não abrem sozinhas no navegador. Arquivo → tela: `Main` → Página inicial, `Entrar` → Entrar e Criar conta, `Sala` → Sala do lote, `Carteira` → Carteira, `MeusLances` → Meus lances, `Comprovante` → Comprovante de arremate, `Auditoria` → Auditoria do lote, `Painel` → Painel do leiloeiro.
