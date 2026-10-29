import type { Role } from '../users/user.entity';

// Mesmas credenciais do README e de web/src/features/auth/demo-accounts.ts.
export const PASSWORD = 'Agora2026!';

type Account = { name: string; email: string; role: Role };

export const ACCOUNTS = {
  auctioneer: {
    name: 'Casa Ágora',
    email: 'leiloeiro@agora.dev',
    role: 'AUCTIONEER',
  },
  geovanna: { name: 'Geovanna', email: 'geovanna@agora.dev', role: 'BIDDER' },
  felipe: { name: 'Felipe', email: 'felipe@agora.dev', role: 'BIDDER' },
} as const satisfies Record<string, Account>;

export type AccountKey = keyof typeof ACCOUNTS;

export type Bidder = Exclude<AccountKey, 'auctioneer'>;

export const BIDDERS: Bidder[] = ['geovanna', 'felipe'];
