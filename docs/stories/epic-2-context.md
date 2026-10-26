# Epic 2 Context: Contas e carteira

<!-- Compilado dos artefatos de planejamento. Edite à vontade. Gere de novo com compile-epic-context se os docs de planejamento mudarem. -->

## Goal

O visitante cria conta com um papel fixo (leiloeiro ou licitante) e entra com e-mail e senha. O licitante vê a carteira e faz depósito simulado. O épico também entrega a base que os épicos 3 a 5 usam: guard de autenticação JWT, guard de papel, exceções de domínio com código estável e o exception filter em `common/`, além do roteamento, do layout com cabeçalho por papel, do provider de sessão e do client de API único no front.

## Stories

- Story 2.1: Cadastro e login na API
- Story 2.2: Carteira e depósito simulado na API
- Story 2.3: Telas Entrar e Criar conta
- Story 2.4: Tela Carteira

## Requirements & Constraints

- O cadastro pede nome, e-mail, senha e papel (`AUCTIONEER` ou `BIDDER`). O papel não muda depois: não existe rota nem tela para trocar.
- O e-mail é único e normalizado em minúsculas. E-mail repetido devolve 409 `EMAIL_TAKEN`.
- No login, e-mail inexistente e senha errada devolvem o mesmo 401 `INVALID_CREDENTIALS`.
- O JWT vai no header `Authorization: Bearer`, vale 8h, carrega `sub` e `role` e não tem refresh. Sem token, ou com token expirado, a API devolve 401.
- Rota de outro papel devolve 403 `ROLE_NOT_ALLOWED`. As rotas de carteira (`GET /wallet`, `POST /wallet/deposits`) são só do licitante.
- Erro de DTO segue o formato `{ code: 'VALIDATION_FAILED', fields: { <campo>: <regra> } }`. Recusa de negócio devolve só `{ code }`, sem texto livre.
- A carteira expõe `balance`, `committed` e `available` (`balance − committed`), em centavos inteiros.
- Depósito: mínimo R$ 1,00 e máximo R$ 100.000,00 por operação, sempre inteiro em centavos. O saldo resultante não pode passar do teto do `integer`. Fora disso a API devolve 400 e o saldo não muda.
- `GET /wallet` dispara uma query só, conferida no log de queries. Nada de N+1.
- Senha, token e dado pessoal nunca aparecem em log.
- Front: estados de carregando, vazio e erro (com "Tentar de novo") e nenhuma quebra a partir de 360px. A lista de lotes que comprometem saldo fica com o estado vazio de verdade até o épico 4 entregá-la na API.

## Technical Decisions

- A senha é guardada com `crypto.scrypt` nativo e salt aleatório por usuário. A comparação usa `timingSafeEqual`. O hash guarda os parâmetros junto, no formato `scrypt$N$r$p$salt$hash`.
- O token é emitido e verificado com `@nestjs/jwt` (dependência aprovada), num guard escrito à mão, sem `passport`. Nova env `JWT_SECRET`, que entra no `.env.example` e no `render.yaml`.
- Toda conta ganha carteira, inclusive o leiloeiro, que recebe o crédito da liquidação no épico 5. A carteira com saldo zero é criada na mesma transação do cadastro, e a migration cria a carteira dos usuários que já existem.
- Tabela `wallets`: `balance` e `committed` em `integer`, `UNIQUE (user_id)` e `CHECK (balance >= committed AND committed >= 0)`, declarado com `@Check`. Tabela `users`: `UNIQUE` no e-mail.
- O depósito roda numa transação com `FOR UPDATE` na carteira e usa só o `manager` da transação.
- Módulos `auth`, `users` e `wallets`. O controller é fino e a regra fica no service. As respostas são classes `*.dto.ts`.
- As exceções de domínio e o exception filter ficam em `common/`, e o filter tem teste unitário.
- Schema só muda por migration gerada pelo CLI e revisada. Nunca `synchronize`, `eager` nem relações lazy.
- Ao instalar qualquer `@nestjs/*`, conferir que o `peerDependencies` aceita o Nest 11.
- Front: `react-router` v7 no modo biblioteca (`createBrowserRouter`, dependência aprovada). As rotas, o layout, a guarda por papel e o provider de sessão ficam em `web/src/app/`.
- Front: um client de API único, que envia o Bearer quando há token. Os tipos das respostas são declarados à mão em `web/src/shared/api/types.ts`.
- Lint: complexidade máxima de 10 e `any` proibido (oxlint no front, ESLint na API).

## UX & Interaction Patterns

- O cabeçalho muda por papel:
  - **Visitante:** Vitrine, Como funciona, Auditoria, Entrar e Criar conta.
  - **Licitante:** acrescenta Meus lances e o resumo da carteira (disponível e comprometido).
  - **Leiloeiro:** acrescenta Painel e Criar lote, sem carteira.
  - Rota que ainda não existe não aparece no menu.
- **Criar conta** (`/signup`): nome, e-mail, senha e papel (Licitante ou Leiloeiro), cada um com uma linha de explicação.
- **Entrar** (`/login`): e-mail e senha.
- Depois de entrar ou criar a conta, o licitante vai para a vitrine e o leiloeiro vai para o painel.
- A sessão sobrevive a um recarregamento da página até o token expirar.
- Os erros vêm traduzidos do código da API e aparecem junto do campo ou do formulário: e-mail já cadastrado, credenciais inválidas e campo inválido (montado a partir de `fields`).
- Rota de outro papel redireciona: `/wallet` aberto por leiloeiro ou visitante leva para fora da tela.
- **Carteira** (`/wallet`):
  - saldo total, comprometido e disponível, formatados em reais só no front;
  - aviso de que o saldo é simulado;
  - lista dos lotes que comprometem saldo, com link para a sala;
  - campo de depósito validado antes do envio;
  - mensagem de sucesso com o novo saldo, e a tela e o resumo do cabeçalho atualizam sem recarregar.
- O visual segue os canvas **Entrar e Criar conta** e **Carteira** do Claude Design.

## Cross-Story Dependencies

- A 2.1 abre a branch com os commits de planejamento antes de qualquer código. Ela entrega os guards, o filter e as exceções de domínio que todas as stories seguintes usam.
- A 2.2 depende da 2.1, porque a carteira nasce na transação do cadastro.
- A 2.3 depende da 2.1, e a 2.4 depende da 2.2 e da 2.3 (client, layout e sessão).
- Com outros épicos:
  - `committed` e a lista de lotes comprometidos são preenchidos pelos lances no épico 4;
  - o crédito na carteira do leiloeiro acontece na liquidação, no épico 5;
  - Meus lances e Painel só entram no menu quando essas telas existirem.
