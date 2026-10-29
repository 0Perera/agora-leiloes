// mesmas contas de api/src/seed/accounts.ts e do README
export const demoPassword = 'Agora2026!';

export type DemoAccount = { name: string; role: string; email: string };

export const demoAccounts: DemoAccount[] = [
  { name: 'Casa Ágora', role: 'Leiloeiro', email: 'leiloeiro@agora.dev' },
  { name: 'Geovanna', role: 'Licitante', email: 'geovanna@agora.dev' },
  { name: 'Felipe', role: 'Licitante', email: 'felipe@agora.dev' },
];
