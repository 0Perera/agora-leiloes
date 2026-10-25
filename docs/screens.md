# Telas

Inventário funcional das telas: **o que** cada uma mostra e faz. **Como** fica visualmente é do Claude Design.
Fonte: enunciado do desafio, `CLAUDE.md` e `docs/decisions.md`.

Regras de uso:
- Conflito de **função** (dado, ação, estado) entre design e este arquivo: vale este arquivo. O design se ajusta.
- Conflito **visual**: vale o design. Stories de front não descrevem visual; apontam o canvas da tela.
- Os nomes das telas são os mesmos no canvas, nas stories e em `web/src/features/`.

## Regras comuns

- Toda tela que busca dados tem os estados **carregando**, **vazio** e **erro** (com "Tentar de novo" quando fizer sentido).
- Nenhuma tela quebra a partir de 360px de largura.
- Dinheiro formatado em reais só no front (`R$ 12.400`). A API trabalha em centavos.
- Datas no fuso do navegador. A contagem regressiva usa `endsAt` corrigido pelo `serverTime` da API.
- Licitantes aparecem só pelo alias do lote. O próprio usuário vê "Você" no lugar do alias dele.
- Cabeçalho muda por papel:
  - **Visitante:** Vitrine, Como funciona, Auditoria, Entrar, Criar conta.
  - **Licitante:** acrescenta Meus lances e o resumo da carteira (disponível + comprometido em lances).
  - **Leiloeiro:** acrescenta Painel do leiloeiro e Criar lote. Sem carteira no cabeçalho.

## Dados da obra (snapshot da Cleveland)

Copiados para o banco na criação do lote. Nenhuma tela de lote chama a API da Cleveland.

| Campo | Origem na Cleveland | Observação |
|---|---|---|
| Título | `title` | só leitura, como veio do acervo |
| Artista | `creators[0].description` | fallback: `culture` |
| Data | `creation_date` | |
| Técnica | `technique` | |
| Dimensões | `measurements` | pode vir vazio |
| Tipo | `type` | |
| ID no acervo | `id` / `accession_number` | |
| Descrição | `did_you_know` ou `description` | opcional, pode vir vazio |
| Imagem | `images.web.url` | baixada e servida por `GET /lots/:id/image` |

## Dados do lote

Número sequencial global e único, exibido em algarismos romanos ("Lote VII"), lance inicial, incremento mínimo, início, fim (com prorrogação),
lance atual, quantidade de lances, status calculado (agendado, ao vivo, encerrado, cancelado).

Os dados da obra vêm **só** do acervo: o leiloeiro não edita título nem escreve observações. Isso impede anunciar uma peça com nome ou descrição falsos.

---

## Página inicial (vitrine) · `features/lots` · rota `/`

**Canvas:** Página inicial (+ 360px). **Status do design:** feito.

- **Destaque:** o lote ao vivo com o **maior lance atual**. Mostra título, artista, descrição, imagem, lance atual, incremento, nº de lances,
  contagem regressiva e aviso de anti-sniping. Licitante logado vê "ganhando" ou "superado" se já deu lance nele.
  - Nenhum lote ao vivo com lance: o ao vivo que encerra primeiro. Nenhum ao vivo: o próximo agendado. Nenhum lote: o bloco some.
  - O destaque é escolhido ao carregar a página e não troca de lote enquanto o usuário olha (só os valores atualizam ao vivo).
- **Como funciona:** quatro passos estáticos (depositar, dar lance, arrematar, auditar).
- **Vitrine:** abas **Ao vivo**, **Agendados** e **Encerrados**, com contagem em cada aba. Lotes cancelados não aparecem.
  - Card: número, título, artista, imagem, preço (lance atual, ou lance inicial se não houver lances; valor final se encerrado)
    e tempo (encerra em / abre em / encerrado em).
  - **Busca** por título, artista ou número do lote, dentro da aba atual.
  - Estados: carregando, erro, aba vazia, busca sem resultado (com "Limpar busca").
- **Auditoria:** texto curto sobre a cadeia de hashes e campo para abrir a auditoria pelo número do lote.
  O campo aceita número arábico ou romano ("7" ou "VII"). Número inexistente: mensagem de lote não encontrado.
- **Tempo real:** só o lote em destaque, pelo stream dele (lance atual e prazo). Os cards não atualizam ao vivo:
  mostram o estado do carregamento da página. O SSE é um stream por lote, e um por card estouraria o limite de conexões do navegador.

## Entrar e Criar conta · `features/auth` · rotas `/login` e `/signup`

**Canvas:** Entrar e Criar conta. **Status do design:** feito.

- **Criar conta:** nome, e-mail, senha e papel (**Licitante** ou **Leiloeiro**), com explicação de uma linha de cada papel.
  O papel não muda depois.
- **Entrar:** e-mail e senha.
- Erros: e-mail já cadastrado, credenciais inválidas, campos inválidos (junto de cada campo).
- Depois de entrar: licitante vai para a vitrine, leiloeiro vai para o painel.

## Sala do lote ao vivo · `features/live-room` · rota `/lots/:id`

**Canvas:** Sala do lote ao vivo (+ 360px). **Status do design:** feito.

- Cabeçalho do lote: número, título, artista, data e técnica, selo **Ao vivo** / **Agendado** / **Encerrado**.
- **Lance atual** (ou lance inicial se não houver lances), contagem regressiva e nota de prorrogação
  ("lances nos últimos 2 min somam 2 min ao fim"; quando prorrogado, indica que foi).
- **Situação do licitante:**
  - ainda não deu lance;
  - **você está ganhando** (o valor está comprometido na carteira);
  - **você foi superado** (mostra o mínimo para cobrir; o saldo voltou ao disponível);
  - **você arrematou** (valor debitado + link do comprovante);
  - **lote encerrado** sem ser o vencedor.
- **Dar lance:** campo de valor com o mínimo aceito como texto de ajuda e botões de atalho (mínimo, +1 e +2 incrementos).
  Visitante vê o botão "Entrar para dar lance". Leiloeiro não vê o formulário.
- **Mensagens de recusa** (o back devolve o código; o front monta o texto):

  | Código | Mensagem |
  |---|---|
  | `BID_BELOW_MINIMUM` | Lance abaixo do mínimo. O mínimo agora é R$ X. |
  | `INSUFFICIENT_BALANCE` | Saldo insuficiente. Seu disponível é R$ X. |
  | `ALREADY_WINNING` | Você já está ganhando. Aguarde ser superado para cobrir. |
  | `LOT_NOT_STARTED` | Este lote ainda não começou. Abre em {data}. |
  | `LOT_ENDED` | Este lote não aceita mais lances. |

- **Histórico de lances:** alias (ou "Você"), valor, horário e marca de quem lidera. Vazio: "Ainda não há lances. O primeiro precisa ser de pelo menos R$ X".
  Link para a auditoria do lote.
- **Sobre a obra e o lote:** imagem e os campos do snapshot, lance inicial, incremento, início e fim previsto.
- **Tempo real (SSE):** novo lance no histórico, lance atual, situação do licitante, fim prorrogado. Ao reconectar, recarrega o estado do lote.
- Estados: carregando, erro ao abrir a sala, lote inexistente ou cancelado (404 com volta à vitrine).

## Carteira · `features/wallet` · rota `/wallet` (só licitante)

**Canvas:** Carteira. **Status do design:** feito.

- **Saldo total**, **comprometido** (soma dos lotes que o licitante lidera) e **disponível** (total − comprometido).
- Lista curta dos lotes que estão comprometendo saldo, com link para a sala.
- **Depósito simulado:** campo de valor, com mínimo e máximo validados. Mensagem de sucesso com o novo saldo.
- Aviso de que o saldo é simulado.

## Meus lances · `features/my-bids` · rota `/my-bids` (só licitante)

**Canvas:** Meus lances. **Status do design:** feito.

- **Em andamento:** lotes ao vivo em que deu lance, com situação (ganhando/superado), lance atual e tempo restante.
- **Arrematados:** lotes vencidos, com valor pago, data, **link do comprovante** e botão **copiar link de compartilhamento**.
- **Não arrematados:** lotes encerrados em que deu lance e perdeu (valor final e o seu maior lance).
- Vazio: "Você ainda não deu lances" com link para a vitrine.

## Comprovante de arremate · `features/receipts` · rota `/receipts/:token` (pública)

**Canvas:** Comprovante de arremate. **Status do design:** feito.

- Número e título do lote, imagem, artista, **valor do arremate**, **alias do vencedor**, data da liquidação.
- **Assinatura:** selo "Comprovante válido" ou "Comprovante inválido" (verificado pela API a cada exibição).
- Hash final da cadeia de lances (abreviado, com opção de copiar) e link para a auditoria do lote.
- Botão copiar link. Sem login. Nenhum dado pessoal.
- Token inexistente: "Comprovante não encontrado".

## Auditoria do lote · `features/audit` · rota `/lots/:id/audit` (pública)

**Canvas:** Auditoria do lote. **Status do design:** feito.

- Número, título e status do lote.
- **Resultado:** **Íntegro** ou **Adulterado**. Se adulterado, aponta o primeiro lance onde a cadeia quebrou
  (ou "lances removidos do fim" quando o selo não bate).
- Lista completa dos lances: nº de sequência, alias, valor, horário, hash abreviado e um indicador por lance (válido/quebrado).
- Explicação curta de como a verificação funciona, com link para a seção Auditoria do README.
- Sem login. Lote inexistente: 404.

## Painel do leiloeiro · `features/auctioneer` · rota `/dashboard` (só leiloeiro)

**Canvas:** Painel do leiloeiro (+ 360px). **Status do design:** feito.

- **Resumo:** total recebido (soma dos lotes arrematados), quantidade de lotes ao vivo (com a soma dos lances atuais),
  agendados (com o próximo início) e encerrados (com quantos ficaram sem venda).
- **Novo lote:**
  1. busca no acervo da Cleveland (resultados com imagem, título, artista e tipo; estados de carregando, vazio e "API do museu fora do ar");
  2. ficha do lote: dados do acervo **só leitura** (título, artista, técnica, dimensões, tipo, ID), número que o lote vai receber,
     lance inicial, incremento mínimo, início e fim. Sem título editável e sem observações.
  - Validações: valores positivos e dentro do teto, fim depois do início, início não no passado.
  - Se o download da imagem falhar, o lote não é criado e a mensagem diz isso.
- **Livro de lotes** (só os do leiloeiro): filtros Todos, Ao vivo, Agendados, Encerrados, Cancelados.
  - Linha: número, obra, estado, lance inicial, resultado (arrematado por R$ X / sem lances / lance atual), nº de lances, período.
  - **Cancelar** só em lote sem lances, com confirmação ("Tirar o lote da vitrine?"). Se um lance chegar antes, a API recusa e a tela avisa.
  - Encerrado e arrematado: link para o comprovante.

---

## Caminhos para a auditoria

O caminho principal é o link "Auditar este lote" na sala, no card da vitrine e no comprovante.
O campo da página inicial é um atalho para quem só tem o número do lote.
