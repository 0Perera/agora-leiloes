---
title: 'Story 2.4: Tela Carteira'
type: 'feature'
created: '2026-10-26'
status: 'done'
baseline_commit: 'c81e5ef943a9de30308b677677faebc635b5a5a3'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/CLAUDE.md'
  - '{project-root}/docs/stories/epic-2-context.md'
  - '{project-root}/docs/screens.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** o licitante não tem como ver os saldos nem depositar pelo navegador, e o cabeçalho não mostra quanto ele pode dar de lance.

**Approach:** tela `/wallet` em `features/wallet`, reescrita em React a partir de `docs/design/Carteira.dc.html`, e o resumo da carteira no cabeçalho do licitante (widget `wallet-scroll` de `docs/design/Main.dc.html`). Um provider de carteira, montado no layout só para licitante, faz um `GET /wallet` e é compartilhado pela tela e pelo cabeçalho; o depósito atualiza os dois com a resposta do `POST /wallet/deposits`.

## Boundaries & Constraints

**Always:**
- Tela: título "Sua carteira", aviso "Saldo simulado. Nenhum valor real é cobrado.", equação total − comprometido = disponível, seção "Onde seu saldo está comprometido" e a ficha "Depositar" com chips R$ 500 / 1.000 / 5.000, textos do canvas.
- Estados: carregando (skeleton + `role="status"`), erro ("Não foi possível carregar sua carteira" + "Tentar de novo") e a lista de lotes comprometidos sempre no estado vazio do canvas ("Nenhum valor comprometido. Todo o seu saldo está livre para lances.") até o épico 4.
- Validação no front antes do envio, com mensagem sob o campo e `aria-invalid`; erro da API traduzido por código (`VALIDATION_FAILED` em `amount` por regra, `BALANCE_LIMIT_EXCEEDED`, rede/5xx).
- Sucesso: "Depósito de R$ X confirmado. Novo saldo total: R$ Y. Disponível para lances: R$ Z." com `role="status"`; o campo limpa; tela e cabeçalho mudam sem recarregar.
- Cabeçalho do licitante: link `wallet-scroll` para `/wallet` com disponível e "Em lances" (comprometido), `aria-label` com os dois valores; mantém "Licitante · nome" e "Sair". Enquanto carrega ou com erro, o widget não aparece.
- Limites no front iguais aos da API: de R$ 1,00 a R$ 100.000,00; dica do campo "De R$ 1 a R$ 100.000 por depósito.". Mensagens: "Informe o valor do depósito.", "O depósito mínimo é R$ 1.", "O limite por depósito simulado é R$ 100.000.", formato inválido "Use só números, com até dois centavos. Ex.: 1.500,50".
- Campo aceita reais com centavos em pt-BR: "1.500", "1500", "1.500,50", "1500,5". Recusa texto, mais de duas casas decimais e vazio.
- `formatMoney(cents)` e `parseAmount(text)` (devolve centavos inteiros ou `null`) em `shared/lib/money.ts`: usados por `app/`, `features/wallet` e, depois, pelo formulário de lance. Valor inteiro sai sem ",00"; com centavos, sai com duas casas. `FieldError` e o CSS de campo inválido vão para `shared/ui/` (agora usados por duas features).
- Rota `/wallet` dentro de `RequireRole role="BIDDER"`. Sem rolagem horizontal a partir de 360px. Estilos em `features/wallet/wallet.css` com tokens; nada de `style` inline copiado.

**Never:** extrato/livro-caixa, abas de filtro e barra proporcional do canvas (não há API); monograma de conta; mudança na API; runtime ou simulação do canvas.

## I/O & Edge-Case Matrix

| Cenário | Entrada / Estado | Esperado | Erro |
|---|---|---|---|
| Carrega | `GET /wallet` 200 | três termos formatados | — |
| Falha | rede/5xx no `GET` | aviso de erro + "Tentar de novo" refaz o `GET` | — |
| Depósito ok | valor válido | 201, mensagem de sucesso, tela e cabeçalho atualizados | — |
| Vazio | campo vazio | "Informe o valor do depósito." sem chamar a API | — |
| Abaixo/acima | fora dos limites | mensagem de limite sem chamar a API | — |
| Formato | texto ou mais de duas casas | mensagem de formato sem chamar a API | — |
| Teto do saldo | 422 `BALANCE_LIMIT_EXCEEDED` | "Com esse depósito, o saldo passaria do limite da carteira." | saldo não muda |
| API fora | rede/5xx no `POST` | "Não foi possível conectar. Tente de novo." | botão volta a habilitar |
| Guarda | visitante / leiloeiro em `/wallet` | `/login` / `/` | — |

**Testes unitários aprovados (vitest):**
- `parseAmount`: aceita "1.500", "1500", "1.500,50" e "1500,5"; recusa texto, mais de duas casas decimais e valor vazio.
- `depositError`: cada regra/código vira a mensagem certa (`it.each`).
- `formatMoney`: inteiro sem ",00"; com centavos, duas casas.

</frozen-after-approval>

## Code Map

- `web/src/app/router.tsx` -- acrescentar `RequireRole role="BIDDER"` com `/wallet`.
- `web/src/app/layout.tsx` -- envolver o conteúdo em `WalletProvider` quando `session.user.role === 'BIDDER'` (com `key` = id do usuário, para zerar ao trocar de conta).
- `web/src/app/header.tsx` -- `Account` mostra `<WalletBadge />` (de `features/wallet`) para licitante, antes do nome.
- `web/src/app/session-provider.tsx`, `use-session.ts` -- só leitura; o 401 já encerra a sessão via `client.ts`.
- `web/src/shared/api/client.ts` -- acrescentar `api.wallet()` e `api.deposit(amount)`; `ApiError` com `status`, `code`, `fields`.
- `web/src/shared/api/types.ts` -- `Wallet { balance, committed, available }` e `DepositRequest { amount }`. Contrato: `api/src/wallets/dto/wallet-response.dto.ts`, `deposit.dto.ts` (`@IsInt @Min(100) @Max(10_000_000)`); POST responde 201 com a carteira inteira.
- `api/src/wallets/wallet.rules.ts` -- `BALANCE_LIMIT_EXCEEDED` (422). Só leitura.
- `web/src/features/auth/form-parts.tsx` + `auth.css` (`.field-error`, `.ag-input.is-invalid`) -- mover `FieldError` e esse CSS para `web/src/shared/ui/field-error.tsx` / `field.css`; auth passa a importar de lá.
- `docs/design/Carteira.dc.html` -- layout, textos e estilos (`.equation`, `.term`, `.op`, `.corners`, `.chip`, `.cols`, `.skel`). `docs/design/Main.dc.html` linhas 56–75 e 105–118 -- `wallet-scroll`.
- `web/.oxlintrc.json` -- complexidade 10, `only-export-components` (provider e hook em arquivos separados, como na sessão).

## Tasks & Acceptance

**Execution:**
- [x] `web/src/shared/ui/field-error.tsx`, `field.css`, `features/auth/*` -- mover `FieldError` (commit `refactor(web)` próprio).
- [x] `web/src/shared/lib/money.ts` + spec -- `formatMoney(cents)`, `parseAmount(text)`.
- [x] `web/src/shared/api/types.ts`, `client.ts` -- tipos e chamadas da carteira.
- [x] `web/src/features/wallet/wallet-provider.tsx`, `use-wallet.ts` -- estado `{ status, wallet, reload, update }`.
- [x] `web/src/features/wallet/deposit.ts` + spec -- `validateAmount`, `depositError`.
- [x] `web/src/features/wallet/wallet-page.tsx`, `balance-equation.tsx`, `deposit-form.tsx`, `wallet-badge.tsx`, `wallet.css` -- tela e widget.
- [x] `web/src/app/router.tsx`, `layout.tsx`, `header.tsx` -- rota, provider e widget.
- [x] `docs/ai-log.md`, `docs/stories/sprint-status.yaml` -- entrada da 2.4; 2.3 `done`, 2.4 `review` ao fim.

**Acceptance Criteria:**
- Given um licitante logado em qualquer tela, when olha o cabeçalho, then vê disponível e comprometido, e o link leva a `/wallet`.
- Given um depósito aceito, when a resposta chega, then o cabeçalho mostra o novo disponível sem recarregar e sem um segundo `GET /wallet`.
- Given `npm run lint:check`, `npm test` e `npm run build` em `web/`, when rodo, then passam.

## Implementation Notes

- Depois da revisão, a pedido do usuário: o campo usa `maskAmount` (máscara de maquininha, só dígitos, centavos pela direita). O `parseAmount` continua lendo o valor mascarado; o achado #4 da triagem deixa de ser alcançável pelo campo.

## Spec Change Log

## Review Triage Log

| # | Achado | Veredito | Evidência | Rota |
|---|---|---|---|---|
| 1 | Digitar ou clicar num chip durante o envio: o `setValue('')` apaga o valor novo | medium | Campo e chips ficavam ativos com `submitting` | patch (`readOnly` no campo, chips desabilitados) |
| 2 | 4xx não mapeado (403, 404, 400 sem código) vira "Não foi possível conectar" | low | `/wallet` tem guarda de papel, 401 já sai para o login, 404 só sem carteira (toda conta tem, D-039) | rejeitado (improvável) |
| 3 | `VALIDATION_FAILED` sem `amount` cai na mensagem de conexão | false | O pipe usa `whitelist` sem `forbidNonWhitelisted` e o corpo sempre leva `amount` | rejeitado |
| 4 | "0.500" e "000.500" aceitos como R$ 500 | low | Regex `grouped` aceita zero à esquerda | listado, não corrigido (não grave) |
| 5 | Colar "R$ 1.500,00" é recusado | low | O prefixo R$ já fica fora do campo; mensagem de formato orienta | listado, não corrigido (não grave) |
| 6 | Layout remonta ao alternar entre licitante e outro estado de sessão | low | Toda troca de sessão já navega (login, Sair, 401); nada de estado local se perde | rejeitado |
| 7 | Suíte `validateAmount` fora dos casos aprovados | low | Acrescentada pela auditoria da matriz (linhas Vazio, Abaixo/acima) | levado ao usuário |

## Verification

**Commands:**
- `cd web && npm run lint:check && npm test && npm run build` -- expected: sem erro.

**Manual checks:**
- Compose + API + `npm run dev`: licitante vê a carteira, deposita valor válido e inválido, "Tentar de novo" com a API parada, leiloeiro e visitante em `/wallet` redirecionados, 360px sem rolagem horizontal.
