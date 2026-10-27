import { PostgreSqlContainer } from '@testcontainers/postgresql';

// Um container para a execução inteira; cada suíte limpa as tabelas no começo (D-061).
export default async function globalSetup(): Promise<void> {
  const container = await new PostgreSqlContainer('postgres:17').start();
  globalThis.postgres = container;
  Object.assign(process.env, {
    DATABASE_URL: container.getConnectionUri(),
    DB_SSL: 'false',
    WEB_ORIGIN: 'http://localhost:5173',
    PORT: '3000',
    JWT_SECRET: 'e2e-jwt-secret-0123456789abcdef0123456789',
    BID_HMAC_SECRET: 'e2e-bid-hmac-secret-0123456789abcdef01234',
    CLEVELAND_API_URL: 'http://cleveland.invalid/api',
  });
}
