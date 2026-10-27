- source_spec: `docs/stories/spec-2-1-cadastro-e-login-na-api.md`
  summary: testes HTTP de auth com Testcontainers (expiração de 8h do token, cadastro simultâneo virando EMAIL_TAKEN via 23505, filter e pipe globais, 401 de /auth/me)
  evidence: hoje só há testes unitários e curl manual; a story 2.1 deixou o e2e para quando o Testcontainers entrar no épico 4.
- source_spec: `docs/stories/spec-2-1-cadastro-e-login-na-api.md`
  summary: limite de tentativas no POST /auth/login (força bruta ilimitada; o scrypt só encarece cada tentativa)
  evidence: fora do escopo da 2.1; se não for implementado, declarar em "Fora do escopo" no README.
- source_spec: `docs/stories/spec-2-4-tela-carteira.md`
  summary: story opcional "Pagamento simulado no depósito", depois do épico 5, só no front: escolha entre Pix (QR ilustrativo + botão "Simular pagamento confirmado") e Cartão (cartão de teste já preenchido •••• 4242 + botão "Pagar (simulado)"), com o aviso "Pagamento simulado, nenhum dado é enviado", sem campos de cartão para digitar e sem mudança na API. Limite de 45 minutos.
  evidence: pedido do usuário no teste da 2.4; hoje o depósito é direto, sem meio de pagamento (declarado em "Fora do escopo" no README).
