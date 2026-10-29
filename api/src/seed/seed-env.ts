const REQUIRED = ['DATABASE_URL', 'BID_HMAC_SECRET'] as const;

// Só o ambiente do processo, nunca o .env: em produção o segredo tem que ser o do Render.
export function seedEnv(env: NodeJS.ProcessEnv): void {
  const missing = REQUIRED.find((name) => !env[name]);
  if (missing) throw new Error(`${missing} is missing`);
}
