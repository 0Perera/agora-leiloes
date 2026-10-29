import { NestFactory } from '@nestjs/core';
import { SettlementTimer } from '../settlement/settlement.timer';
import { seed } from './seed';
import { seedEnv } from './seed-env';

async function main(): Promise<void> {
  seedEnv(process.env);
  // Import tardio: o AppModule valida as envs ao carregar, antes da mensagem do seedEnv.
  const { AppModule } = await import('../app.module.js');
  const app = await NestFactory.createApplicationContext(AppModule);
  try {
    // Bloqueia novos agendamentos; uma passada já em curso é coberta pelo seed,
    // que não dá lance em lote liquidado.
    app.get(SettlementTimer).onModuleDestroy();
    await seed(app);
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
