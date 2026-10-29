# Telas

Inventário funcional das telas: **o que** cada uma mostra e faz. **Como** fica visualmente é do canvas do Claude Design (`docs/design/`).
Fonte: enunciado do desafio, `CLAUDE.md`, `docs/decisions.md` e o código em `web/src/`.

Regras de uso:
- Conflito de **função** (dado, ação, estado) entre design e este arquivo: vale este arquivo. O design se ajusta.
- Conflito **visual**: vale o design. Stories de front não descrevem visual; apontam o canvas da tela.
- Os nomes das telas são os mesmos no canvas, nas stories e em `web/src/features/`.

## Regras comuns

- Toda tela que busca dados tem os estados **carregando**, **vazio** e **erro** (com "Tentar de novo" quando fizer sentido).
- Nenhuma tela quebra a partir de 360px de largura.
- Dinheiro formatado em reais só no front, sempre com centavos (`R$ 12.400,00`, D-048). A API trabalha em centavos.
- Datas no fuso do navegador. A contagem regressiva usa `endsAt` corrigido pelo `serverTime` da API.
- Número do lote em romano com o número comum ao lado ("Lote DXXXVII · nº 537"); acima de 3999, só o comum (D-054).
- Licitantes aparecem só pelo alias do lote. O próprio usuário vê "Você" no lugar do alias dele.
- Cabeçalho (`app/header.tsx`):
  - **Todos:** Vitrine, Como funciona e Auditoria (os dois últimos rolam até a seção da página inicial).
  - **Visitante:** Entrar e Criar conta.
  - **Licitante:** Meus lances, resumo da carteira (disponível e em lances) e o menu da conta.
  - **Leiloeiro:** Painel do leiloeiro e o menu da conta. Sem carteira no cabeçalho.
  - **Menu da conta:** monograma com nome, papel e Sair.

## Dados da obra (snapshot da Cleveland)

Copiados para o banco na criação do lote. Nenhuma tela de lote chama a API da Cleveland; só a busca do painel mostra imagens do CDN dela.

| Campo | Origem na Cleveland | Observação |
|---|---|---|
| Título | `title` | só leitura, como veio do acervo |
| Artista | `creators[0].description` | fallback: `culture` |
| Data | `creation_date` | |
| Técnica | `technique` | |
| Dimensões | `measurements` | pode vir vazio; só na sala |
| Tipo | `type` | traduzido por mapa fixo no front |
| ID no acervo | `id` / `accession_number` | |
| Descrição | `did_you_know` ou `description` | opcional, pode vir vazio |
| Imagem | `images.web.url` | baixada e servida por `GET /lots/:id/image` |

Os textos da obra aparecem em inglês, como no acervo (D-038).

## Dados do lote

Número sequencial global e único (D-054), lance inicial, incremento mínimo, início, fim (com prorrogação),
lance atual, quantidade de lances, status calculado (agendado, ao vivo, encerrado; cancelado só no painel).

Os dados da obra vêm **só** do acervo: o leiloeiro não edita título nem escreve observações. Isso impede anunciar uma peça com nome ou descrição falsos.

---

## Página inicial (vitrine) · `features/lots` · rota `/`

**Canvas:** `Main.dc.html`.

- **Destaque:** o lote ao vivo com o **maior lance atual** (D-037). Mostra título, artista, descrição, imagem, lance atual, aumento mínimo, nº de lances,
  contagem regressiva e aviso de anti-sniping. Licitante que já deu lance vê "Você está ganhando" ou "Você foi superado".
  - Nenhum lote ao vivo com lance: o ao vivo que encerra primeiro. Nenhum ao vivo: o próximo agendado ("Abre em"). Nenhum lote: o bloco some.
  - O destaque é escolhido ao carregar a página e não troca de lote enquanto o usuário olha (só os valores atualizam ao vivo).
  - Links "Entrar na sala do lote" e "Auditar este lote".
- **Como funciona:** quatro passos estáticos (Deposite saldo, Dê seu lance, Arremate, Audite).
- **Vitrine:** abas **Ao vivo**, **Agendados** e **Encerrados**, com contagem em cada aba. Lotes cancelados não aparecem.
  - Card: número, título, artista, imagem, preço (lance atual ou inicial; "Arrematado por" ou "Sem lances" se encerrado),
    tempo (Encerra em / Últimos minutos / Abre em / Encerrado em) e link "Auditar este lote".
  - **Busca** por título, artista ou número do lote (algarismos, romano ou "lote …"). Abre a primeira aba com resultado; ao limpar, volta para Ao vivo.
  - 12 por página. Estados: carregando, erro, aba vazia, busca sem resultado (com "Limpar busca").
- **Auditoria:** texto curto sobre o histórico público e campo para abrir a auditoria pelo número do lote.
  O campo aceita "7", "VII" ou "vii". Número inexistente: "Lote … não encontrado", junto do campo.
- **Tempo real:** só o lote em destaque, pelo stream dele (lance atual, nº de lances e prazo). Os cards não atualizam ao vivo:
  mostram o estado do carregamento da página. O SSE é um stream por lote, e um por card estouraria o limite de conexões do navegador.

## Entrar e Criar conta · `features/auth` · rotas `/login` e `/signup`

**Canvas:** `Entrar.dc.html`.

- **Criar conta:** nome, e-mail, senha e papel (**Licitante** ou **Leiloeiro**), com explicação de uma linha de cada papel.
  O papel não pode ser trocado depois.
- **Entrar:** e-mail e senha. Bloco "Contas de demonstração" com as três contas do seed (Casa Ágora, Geovanna, Felipe), que preenche o formulário com um clique, e a senha comum.
- Erros: e-mail já cadastrado, credenciais inválidas, muitas tentativas (`TOO_MANY_ATTEMPTS`, D-068), campos inválidos (junto de cada campo).
- Depois de entrar: licitante vai para a vitrine, leiloeiro vai para o painel. Usuário logado que abre essas rotas vai para a página do seu papel.
- Sessão expirada (401 durante o uso): volta para Entrar com o aviso "Sua sessão expirou, entre de novo".

## Sala do lote · `features/live-room` · rota `/lots/:id`

**Canvas:** `Sala.dc.html`.

- Cabeçalho do lote: selo **Ao vivo** / **Agendado** / **Encerrado**, número, título e linha com artista e data.
- **Lance atual** (lance inicial sem lances; lance vencedor no encerrado), líder e nº de lances, contagem regressiva e nota de prorrogação
  ("Lances nos últimos 2 minutos estendem o fim em +2 min."; quando prorrogado, "Prorrogado em +2 min pelo último lance.").
- Agendado: bloco "Abre em". Na virada (abre ou encerra com a página aberta), a sala busca o lote de novo, até 3 vezes a cada 2 s.
- **Situação do licitante:**
  - ainda não deu lance;
  - **Você está ganhando** (o valor está comprometido na carteira);
  - **Você foi superado** (mostra o mínimo para cobrir; o saldo voltou ao disponível);
  - **Você arrematou este lote** (valor debitado + link do comprovante, só para o vencedor);
  - lote encerrado: vencedor e valor, ou "O lote fechou sem lances"; sem liquidação ainda, "aguardando liquidação".
- **Dar lance:** campo de valor com o mínimo como texto de ajuda e atalhos (mínimo, +1 e +2 incrementos).
  Visitante vê "Entrar para dar lance". Leiloeiro não vê o formulário.
- **Mensagens de recusa** (o back devolve o código; o front monta o texto, em `bid-errors.ts`):

  | Código | Mensagem |
  |---|---|
  | `BID_BELOW_MINIMUM` | Lance abaixo do mínimo. O mínimo agora é R$ X. |
  | `INSUFFICIENT_BALANCE` | Saldo insuficiente. Seu disponível é R$ X. |
  | `ALREADY_WINNING` | Você já está ganhando. Aguarde ser superado para cobrir. |
  | `LOT_NOT_STARTED` | Este lote ainda não começou. Abre em {data}. |
  | `LOT_ENDED` | Este lote não aceita mais lances. |
  | `LOT_INTEGRITY_FAILED` | Lances suspensos neste lote. O histórico de lances não passou na verificação de integridade. Seu lance não foi registrado. |
  | `VALIDATION_FAILED` | Informe o valor do lance. |
  | sem resposta | Não foi possível enviar o lance. Verifique a conexão e tente de novo. |

- **Histórico de lances:** alias (ou "Você"), valor, horário e marca "Lidera" (ao vivo), "Último lance" (aguardando liquidação) ou "Arrematou".
  Vazio: "Ainda não há lances. O primeiro lance precisa ser de pelo menos R$ X." Mais antigos por "Ver lances anteriores". Link "Auditar este lote".
- **Sobre a obra e o lote:** campos do snapshot, lance inicial, incremento, início e fim.
- **Tempo real (SSE):** novo lance no histórico, lance atual, situação do licitante, fim prorrogado e aviso de encerramento.
  Queda da conexão: "Conexão perdida. Reconectando…" e botão travado; ao reconectar, recarrega o lote. A carteira do cabeçalho é relida quando a situação muda.
- Estados: carregando, erro com "Tentar de novo", lote inexistente ou cancelado ("Lote não encontrado", com volta à vitrine).

## Carteira · `features/wallet` · rota `/wallet` (só licitante)

**Canvas:** `Carteira.dc.html`.

- **Saldo total**, **comprometido** (soma dos lotes que o licitante lidera ou arrematou sem liquidação) e **disponível** (total − comprometido), com barra de proporção.
- Lotes que comprometem saldo, até 20 e "e mais N lotes" (D-063): número, título, situação ("Você lidera · encerra {data}" ou "Você arrematou · aguardando liquidação"), valor e link para a sala.
- **Depósito simulado:** campo com máscara de moeda e atalhos, de R$ 1,00 a R$ 100.000,00. Saldo atualizado só com a resposta da API (D-049); confirmação curta ("Depósito confirmado" / "R$ X adicionados ao seu saldo."), sem repetir os saldos que a tela já mostra.
- Aviso de que o saldo é simulado.

## Meus lances · `features/my-bids` · rota `/my-bids` (só licitante)

**Canvas:** `MeusLances.dc.html`.

- Abas com contagem, 20 por página, cada lote numa placa com selo, imagem, valores e ações:
  - **Em andamento:** situação (Você está ganhando / Você foi superado), lance atual, o seu lance, tempo restante e "Cobrir lance" ou "Abrir sala".
    Lote vencido sem liquidação: "Encerrado, aguardando liquidação" ou "Você arrematou · aguardando liquidação".
  - **Arrematados:** valor pago, data, link do comprovante e "Copiar link de compartilhamento".
  - **Não arrematados:** valor final, o seu maior lance, "Abrir sala" e "Auditar lote".
- Vazio geral: "Você ainda não deu lances", com link para a vitrine; cada aba tem o próprio texto de vazio.

## Comprovante de arremate · `features/receipts` · rota `/receipts/:token` (pública)

**Canvas:** `Comprovante.dc.html`.

- Número e título do lote, imagem, artista, **valor do arremate**, **alias do vencedor**, data do arremate.
- **Assinatura:** selo "Comprovante válido" ou "Comprovante inválido" (verificado pela API a cada exibição). O válido diz que só a assinatura foi conferida
  e aponta a auditoria para o histórico; o inválido continua mostrando todos os dados.
- Código de verificação (hash final da cadeia, abreviado, com cópia), "Copiar link" e "Auditar este lote". Cópia manual quando o navegador recusa.
- Sem login. Nenhum dado pessoal. Token inexistente: "Comprovante não encontrado".

## Auditoria do lote · `features/audit` · rota `/lots/:id/audit` (pública)

**Canvas:** `Auditoria.dc.html`.

- Número, título, artista e status do lote.
- **Veredito** (`audit.ts`), com "Verificar de novo" (o veredito anterior fica na tela se a nova verificação falhar):

  | Resultado da API | Título |
  |---|---|
  | `intact` | Histórico íntegro |
  | `tampered` | Histórico adulterado no lance N |
  | `truncated` | Histórico adulterado: lances removidos do fim |
  | `receipt_tampered` | Comprovante não confere com o histórico |

- Lista completa dos lances (D-066): nº de sequência, alias, valor, horário, código (escondido por padrão, "Mostrar códigos") e a marca
  **Íntegro**, **Adulterado** (com nota no lance quebrado) ou **Não verificável** (os seguintes).
- Explicação curta de como a verificação funciona, com link para a seção Auditoria do README. Sem link para o comprovante: o token só chega ao vencedor.
- Sem login. Lote inexistente ou cancelado: "Lote não encontrado".

## Painel do leiloeiro · `features/auctioneer` · rota `/dashboard` (só leiloeiro)

**Canvas:** `Painel.dc.html`.

- **Resumo:** total recebido (soma dos comprovantes), lotes ao vivo (com a soma dos lances atuais),
  agendados (com o próximo início) e encerrados (com quantos ficaram sem lance).
- **Novo lote a partir do acervo** (sempre visível):
  1. busca no acervo com seletor de departamento (D-050): resultados com imagem do CDN, título, artista e tipo; estados de carregando, vazio e "O acervo do museu não respondeu";
  2. ficha do lote: dados do acervo **só leitura** (título, artista, data, técnica, tipo, imagem), lance inicial, aumento mínimo, início e fim.
     Sem número do lote (D-053), sem título editável e sem observações.
  - Validações: valores dentro das faixas da API, fim depois do início, início não no passado; resumo "Corrija N campos".
  - Se o download da imagem falhar, o lote não é criado e a mensagem diz isso. Peça já em lote ativo: `ARTWORK_ALREADY_LISTED` (D-051).
  - Depois de criar: janela "Lote … publicado", com "Ver no livro" e "Criar outro lote".
- **Livro de lotes** (só os do leiloeiro): filtros Todos, Ao vivo, Agendados, Encerrados, Cancelados, com contagem; 20 por página.
  - Linha: número, obra, estado, lance inicial, resultado (arrematado por R$ X / sem lances / aguardando liquidação / lance atual), nº de lances, período.
  - **Cancelar** só em lote sem lances, com confirmação ("Tirar o lote da vitrine?"). Se um lance chegar antes, a API recusa (`LOT_HAS_BIDS`) e a tela avisa.
  - "Abrir sala" em todo lote não cancelado; encerrado e arrematado: link para o comprovante.

---

## Caminhos para a auditoria

O caminho principal é o link "Auditar este lote" no destaque, no card da vitrine, na sala, no comprovante e em Meus lances (não arrematados).
O campo da página inicial é um atalho para quem só tem o número do lote.
