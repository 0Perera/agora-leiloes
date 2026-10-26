---
title: 'Story 2.3: Telas Entrar e Criar conta'
type: 'feature'
created: '2026-10-25'
status: 'done'
baseline_commit: '2117634dde6c21f35c63b7913492ae2657debd49'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/CLAUDE.md'
  - '{project-root}/docs/stories/epic-2-context.md'
  - '{project-root}/docs/screens.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** o front é só um health check; não há como criar conta, entrar nem manter sessão, e as telas dos épicos seguintes não têm rotas, layout nem client autenticado onde se apoiar.

**Approach:** `react-router` 7 (D-041) com rotas, layout com cabeçalho por papel, provider de sessão e guarda por papel em `web/src/app/`; telas `/login` e `/signup` em `features/auth`, reescritas em React a partir de `docs/design/Entrar.dc.html`, usando `tokens.css` e `bundle.css` copiados para `web/src/shared/ui/`. Erros vêm só da API e são traduzidos por código/campo.

## Boundaries & Constraints

**Always:**
- `react-router@^7.18.4` (última 7.x; a 8.x existe, mas D-041 fixou a 7). `createBrowserRouter` + `RouterProvider`, modo biblioteca.
- Sessão: `{ token, user }` em `localStorage`. No boot, lê o `exp` do payload do JWT (base64url, sem lib); expirado ou ilegível → limpa e vira visitante. Qualquer 401 numa chamada que levou token também limpa a sessão. Não chama `/auth/me` no boot (cold start do Render travaria o app até 1 min).
- Client único em `shared/api/client.ts`: envia `Authorization: Bearer` quando há token; resposta não-ok vira `ApiError { status, code?, fields? }`; falha de rede vira `ApiError` com `status: 0`.
- Tradução em `features/auth/auth-errors.ts`: `INVALID_CREDENTIALS` → aviso do formulário; `EMAIL_TAKEN` → sob o e-mail; `VALIDATION_FAILED` → mensagem por campo a partir de `fields` (regra + valor vazio), com os textos do canvas; rede/5xx → aviso "Não foi possível conectar. Tente de novo.".
- Formulário com `noValidate`: sem validação duplicada no front; botão desabilitado e "Entrando…/Criando conta…" durante o envio.
- Abas "Entrar"/"Criar conta" do canvas são links para `/login` e `/signup`. Mostrar/Ocultar senha, faixa escura com a lista em 3 passos e os cartões de papel mantidos.
- Pós-login/cadastro: `BIDDER` → `/`, `AUCTIONEER` → `/dashboard`. Logado abrindo `/login` ou `/signup` → redirecionado para a página do seu papel.
- Guarda: `RequireRole` sem sessão → `/login`; papel errado → `/`.
- `/dashboard` mínimo em `features/auctioneer` (título "Painel do leiloeiro" e uma linha), só `AUCTIONEER`; a 3.5 substitui.
- "Sair" no cabeçalho para licitante e leiloeiro, ao lado do nome: limpa a sessão e vai para `/login`.
- 401 com token encerra a sessão e leva para `/login` com o aviso "Sua sessão expirou, entre de novo".
- Token no `localStorage` registrado no `decisions.md` (nova D-NNN): risco de XSS; cookie httpOnly descartado pela D-006; mitigado pelo escape do React e pela validade de 8h.
- `vitest` como devDependency; script `npm test` no `web/` e no job `web` do CI.
- Menu mostra só rotas existentes. Estilos do canvas viram classes em CSS (`app/layout.css`, `features/auth/auth.css`); nada de `style` inline copiado.
- Sem rolagem horizontal a partir de 360px.

**Never:**
- Runtime do canvas (`x-dc`, `sc-if`, `support.js`) ou a lógica de simulação; mensagem de sucesso com "Continuar" (redireciona direto); refresh token; vitrine, painel ou carteira de verdade; mudança na API.

## I/O & Edge-Case Matrix

| Cenário | Entrada / Estado | Esperado | Erro |
|---|---|---|---|
| Cadastro ok | nome, e-mail, senha ≥ 8, papel | 201, sessão salva, redireciona pelo papel | — |
| Login ok | credenciais válidas | 200, sessão salva, redireciona | — |
| Credenciais | 401 `INVALID_CREDENTIALS` | aviso "Não foi possível entrar / E-mail ou senha incorretos…" | campos mantêm o valor |
| E-mail repetido | 409 `EMAIL_TAKEN` | sob o e-mail: "Este e-mail já está cadastrado. Entre com ele ou use outro." | — |
| Campos | 400 `fields: { email: 'isEmail', password: 'isLength', role: 'isIn' }` | mensagem sob cada campo; vazio vira "Informe seu e-mail." / "Crie uma senha." | `aria-invalid` no campo |
| API fora | rede falha ou 5xx | aviso de conexão no formulário | botão volta a habilitar |
| Recarregar | token com `exp` no futuro | continua logado | — |
| Expirado | `exp` no passado ou 401 com token | volta a visitante | — |
| Guarda | visitante em `/dashboard` / licitante em `/dashboard` | `/login` / `/` | — |
| Já logado | licitante/leiloeiro abre `/login` ou `/signup` | `/` / `/dashboard` | — |
| Sessão expira em uso | 401 numa chamada com token | sessão limpa, `/login` com "Sua sessão expirou, entre de novo" | — |

**Testes unitários aprovados (vitest):**
- leitura do `exp` do token: aceita token válido; recusa token expirado; recusa token ilegível.
- `authError`: cada código/regra vira a mensagem certa (`it.each`).

</frozen-after-approval>

## Code Map

- `web/src/main.tsx` -- importa `shared/ui/tokens.css`, `shared/ui/bundle.css`, `app/app.css`; renderiza `<App />`.
- `web/src/app/App.tsx` -- hoje faz health check; vira `SessionProvider` + `RouterProvider`. O health some (o `GET /health` continua na API).
- `web/src/shared/api/client.ts` -- `request<T>` sem headers; ampliar com método, body JSON, Bearer e `ApiError`. Remover `api.getHealth`: nenhuma tela usa.
- `web/src/shared/api/types.ts` -- acrescentar `Role`, `User`, `AuthResponse`, `SignupRequest`, `LoginRequest`, `ApiErrorBody`. Contrato: `api/src/auth/dto/*.ts` (`AuthResponseDto { token, user: { id, name, email, role } }`).
- `api/src/common/validation.pipe.ts` -- formato de `fields`: `{ campo: regra }`, uma regra por campo (`isEmail`, `isNotEmpty`, `isLength`, `maxLength`, `isIn`, `isString`). Só leitura.
- `api/src/auth/dto/signup.dto.ts`, `login.dto.ts` -- limites: nome ≤ 100, e-mail ≤ 254, senha 8–128, papel `AUCTIONEER|BIDDER`.
- `docs/design/Entrar.dc.html` -- layout, textos e estilos (bloco `<style>` do `helmet`). `docs/design/Main.dc.html` linhas 82–126 -- cabeçalho por papel.
- `docs/design/ds/agora/tokens.css`, `components/bundle.css` -- copiar sem editar; o `bundle.css` já faz `@import` das Google Fonts.
- `web/.oxlintrc.json` -- `complexity` 10, `no-explicit-any`, `only-export-components` (hook e provider em arquivos separados).

## Tasks & Acceptance

**Execution:**
- [x] `web/src/shared/ui/tokens.css`, `bundle.css` + `web/src/main.tsx` -- cópia e import (commit `chore(web)` próprio).
- [x] `web/package.json` -- `react-router@^7.18.4`.
- [x] `web/src/shared/api/types.ts`, `client.ts` -- tipos de auth, `ApiError`, Bearer, `onUnauthorized`.
- [x] `web/src/app/session.ts` (estado, storage, `exp`), `session-provider.tsx`, `use-session.ts` -- sessão.
- [x] `web/src/app/router.tsx`, `layout.tsx`, `header.tsx`, `require-role.tsx`, `app.css`, `layout.css` -- rotas e cabeçalho por papel.
- [x] `web/src/features/auth/login-page.tsx`, `signup-page.tsx`, `auth-card.tsx`, `password-field.tsx`, `auth-errors.ts`, `auth.css` -- telas.
- [x] `web/src/features/auctioneer/dashboard-page.tsx` -- placeholder do painel.
- [x] `web/vite.config.ts`, `web/package.json`, `.github/workflows/ci.yml` -- vitest, `npm test`, passo no job `web`.
- [x] `docs/decisions.md` -- D-047 token no `localStorage`.
- [x] `web/src/features/lots/home-page.tsx` -- placeholder da vitrine em `/` (só o título; a 3.6 substitui).
- [x] `docs/ai-log.md`, `docs/stories/sprint-status.yaml` -- entrada da 2.3; 2.2 `done`, 2.3 `review` ao fim.

**Acceptance Criteria:**
- Given um licitante e um leiloeiro logados, when cada um vê o cabeçalho, then só aparecem os itens do papel que já têm rota.
- Given `npm run lint:check` e `npm run build` em `web/`, when rodo, then passam.
- Given 360px no devtools, when abro `/login` e `/signup`, then não há rolagem horizontal.

## Implementation Notes

## Spec Change Log

## Review Triage Log

| # | Achado | Veredito | Evidência | Rota |
|---|---|---|---|---|
| 1 | Recarregar com token vencido não mostra o aviso de sessão expirada | low | A matriz pede só "volta a visitante" no reload; a linha do README prometia o aviso | patch (README) |
| 2 | Token expira com a aba aberta e sem chamada à API: UI segue logada | low | Real, mas a próxima chamada autenticada dá 401 e encerra; timer adiciona estado | rejeitado (low, fix adiciona complexidade) |
| 3 | 401 em rota protegida: `RequireRole` redireciona sem state e pode perder o aviso | medium | `setSession(null)` re-renderiza a guarda antes da navegação do router (v7 aplica em transition) | patch |
| 4 | `expired` no history state reaparece em reload/voltar | low | Real; resolvido junto com o #3 (flag em memória no provider) | patch (via #3) |
| 5 | 2xx sem `token`/`user` gravaria sessão inválida | false | A API só devolve `AuthResponseDto` nessas rotas; não há caminho que produza o corpo descrito | rejeitado |
| 6 | `isUser` não confere `id` e `email` | low | Storage só é escrito pelo próprio app; nenhum consumidor lê `id`/`email` hoje | rejeitado (low) |
| 7 | `VALIDATION_FAILED` só com campos fora de `AuthField` deixa o form sem mensagem | false | O pipe usa `whitelist: true` sem `forbidNonWhitelisted`: propriedade extra é removida, não gera erro | rejeitado |
| 8 | `isLength` em nome/e-mail mostraria a mensagem da senha | false | Só `password` usa `@Length`; nome e e-mail usam `@MaxLength` | rejeitado |
| 9 | Login/logout em outra aba não sincroniza a sessão | low | Real, uso raro; o 401 cobre token trocado; listener de `storage` adiciona superfície | rejeitado (low) |

## Design Notes

Rotas (`router.tsx`): `Layout` como pai; filhos `/` (home), `/login`, `/signup`, `/dashboard` (se 1a). `RequireRole` como elemento de rota com `<Outlet />`.

Mensagem de campo usa a regra e o valor enviado, porque a API só manda a regra: `email` vazio → "Informe seu e-mail."; `isEmail` → "Este e-mail não parece válido. Ex.: nome@dominio.com"; `password` vazio → "Crie uma senha." (cadastro) / "Informe sua senha." (login); `isLength` → "A senha precisa ter entre 8 e 128 caracteres."; `role` → "Escolha se você vai participar como licitante ou leiloeiro."; `name` vazio → "Informe seu nome."; `maxLength` → "Use no máximo N caracteres.".

## Verification

**Commands:**
- `cd web && npm run lint:check && npm run build` -- expected: sem erro.

**Manual checks (if no CLI):**
- `docker compose up -d db`, API e `npm run dev`: cadastro dos dois papéis, login certo/errado, e-mail repetido, campos vazios, recarregar logado, token adulterado no storage, guarda de `/dashboard`, 360px.
