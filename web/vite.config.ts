import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  // fuso fixo nos testes, para o CI (UTC) e a máquina local darem o mesmo resultado
  test: { env: { TZ: 'America/Sao_Paulo' } },
});
