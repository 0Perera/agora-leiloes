# Ágora

Casa de leilões online de arte clássica europeia, com lances ao vivo e histórico auditável.

_(o que faz: lista curta de funcionalidades)_

- App: https://agora-web-gp1g.onrender.com
- API: https://agora-api-w6z9.onrender.com (status em [`/health`](https://agora-api-w6z9.onrender.com/health))

## Testar agora

> O primeiro acesso pode levar até 1 min: a API dorme após 15 min sem tráfego (plano free do Render).

_(credenciais do seed e um roteiro curto de teste)_

## Rodar local

Tudo com Docker, num comando só (pré-requisito: Docker):

```bash
docker compose up --build
```

Front em http://localhost:5173, API em http://localhost:3000, banco na 5432.
Se alguma porta estiver ocupada: `WEB_PORT=5174 API_PORT=3001 DB_PORT=5433 docker compose up --build`.
As migrations rodam sozinhas no boot da API.

Para desenvolver com hot reload (pré-requisito: Node 24), suba só o banco e rode API e front com npm:

```bash
docker compose up -d db

cd api && cp .env.example .env && npm ci && npm run start:dev   # ajuste DATABASE_URL se mudou DB_PORT
cd web && cp .env.example .env && npm ci && npm run dev         # outro terminal
```

A API não sobe se faltar variável de ambiente, e a mensagem diz qual.

Migrations (em `api/`):

```bash
npm run migration:generate -- src/database/migrations/NomeDaMudanca   # a partir das entidades
npm run migration:create -- src/database/migrations/NomeDaMudanca     # vazia
npm run migration:run                                                 # aplica (o boot também aplica)
npm run migration:revert                                              # desfaz a última
```

## Arquitetura

_(módulos, fluxo de um lance e liquidação)_

## Auditoria

_(como a técnica detecta alteração, remoção e inserção no histórico)_

## Comportamentos esperados

_(regras que podem surpreender, uma linha cada, com o porquê)_

- A sessão dura 8h e não renova: token vencido no recarregamento volta a visitante; um 401 durante o uso leva para Entrar com aviso de sessão expirada (D-006).
- A busca no acervo mostra só pintura e escultura europeia ou arte grega e romana, um departamento por vez (tema da casa, D-050), e só peças com imagem.
- Uma peça só fica em um lote agendado ou ao vivo por vez; lote encerrado ou cancelado libera a peça para outro lote (D-051).
- Lote cancelado some da vitrine e do destaque, e o link direto dele responde 404 (lote não encontrado).
- O leiloeiro só cancela lote próprio, agendado ou ao vivo e sem lances, como pede o enunciado: com lance responde `LOT_HAS_BIDS` e encerrado `LOT_ENDED`. Cancelar com lances exigiria estornar o saldo comprometido do líder, e o cancelamento com estorno é um opcional que não entrou (D-018). Lote de outro leiloeiro responde 404, sem revelar que existe.
- O número do lote só aparece depois da criação: a sequência é global, e outro leiloeiro pode pegar o número enquanto a ficha está aberta (D-053).
- O número do lote aparece em romano com o número comum ao lado ("Lote XIV · nº 14"); acima de 3999, onde o romano padrão acaba, aparece só o número comum (D-054).
- O destaque da página inicial é escolhido ao abrir a página e não troca de lote enquanto ela está aberta, mesmo que outro lote passe a ter o maior lance: a troca no meio da leitura tiraria a obra da frente do visitante.
- Na busca da vitrine, "7", "VII" e "lote vii" procuram o número do lote; romano em minúscula sem o "lote " vai como texto, porque o acervo tem nomes como "Agnolo di Cosimo". A busca abre a primeira aba com resultado (Ao vivo, Agendados, Encerrados), para o visitante não achar que nada existe só porque a aba atual está vazia.
- A sala do lote não calcula o status no navegador: quando a contagem chega ao início ou ao fim, ela busca o lote de novo (e repete até 3 vezes, a cada 2 s, se o status ainda não mudou), porque a hora de referência é a do servidor.
- Os dados das obras (título, técnica, dimensões, descrição) aparecem como no acervo da Cleveland, em inglês, porque vêm só do acervo (D-038); só o tipo da obra é traduzido.

## Testes

```bash
cd api && npm test   # Jest, unitários ao lado de cada arquivo (*.spec.ts)
cd web && npm test   # Vitest
```

- **API:** regras de saldo e depósito, validação dos DTOs, hash de senha, cadastro e login, guards de token e de papel, filters de erro, `/health` e o logger que esconde parâmetros de query.
- **Catálogo:** mapeamento da peça da Cleveland (artista com fallback para `culture`, descarte de peça sem imagem), cache da busca com TTL, falha da Cleveland virando `CATALOG_UNAVAILABLE` sem entrar no cache e download da imagem (só JPEG, PNG ou WebP, até 5 MB contados nos bytes lidos).
- **Lotes:** datas de início e fim, peça já em lote ativo, limites de lance inicial e incremento, falha da imagem sem gravar lote, cadeia do destaque (maior lance, fim mais próximo, próximo agendado), filtros da vitrine e do painel, resumo do painel sem lotes e cancelamento (encerrado, com lance, lote alheio e trava da linha).
- **Front:** leitura do `exp` do token, tradução dos erros da API, valor e formatação de moeda, validação do depósito, rótulos e nota do resumo da sala do lote, id inválido na rota da sala, nova busca na virada de estado e tradução do tipo da obra.

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
