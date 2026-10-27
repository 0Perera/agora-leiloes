import type { Movement } from '../bids/bid.rules';

export type SettlementLot = {
  endsAt: Date;
  cancelledAt: Date | null;
  settledAt: Date | null;
  currentBid: number | null;
  auctioneerId: number;
};

export type SettlementState = {
  lot: SettlementLot;
  last: Movement | null;
  now: Date;
};

export type Skip = {
  settle: false;
  reason: 'CANCELLED' | 'ALREADY_SETTLED' | 'NOT_ENDED';
};

export type WalletMove = { userId: number; balance: number; committed: number };

export type Close = {
  settle: true;
  winner: Movement | null;
  moves: WalletMove[];
};

export type SettlementDecision = Close | Skip;

export function decide(state: SettlementState): SettlementDecision {
  return skip(state) ?? close(state);
}

// Vencedor e valor só do último lance da cadeia, nunca de currentBid (D-042).
function close({ lot, last }: SettlementState): Close {
  if (!last) return { settle: true, winner: null, moves: [] };
  const winner = { userId: last.userId, amount: last.amount };
  return { settle: true, winner, moves: movesOf(winner, lot.auctioneerId) };
}

function movesOf(winner: Movement, auctioneerId: number): WalletMove[] {
  const { userId, amount } = winner;
  return [
    { userId, balance: -amount, committed: -amount },
    { userId: auctioneerId, balance: amount, committed: 0 },
  ];
}

// A ordem define o motivo devolvido quando mais de uma checagem falharia.
function skip(state: SettlementState): Skip | null {
  return checkCancelled(state) ?? checkSettled(state) ?? checkEnded(state);
}

function checkCancelled({ lot }: SettlementState): Skip | null {
  if (lot.cancelledAt) return { settle: false, reason: 'CANCELLED' };
  return null;
}

function checkSettled({ lot }: SettlementState): Skip | null {
  if (lot.settledAt) return { settle: false, reason: 'ALREADY_SETTLED' };
  return null;
}

// Fim inclusivo, a mesma fronteira da recusa de lance (LOT_ENDED).
function checkEnded({ lot, now }: SettlementState): Skip | null {
  if (now.getTime() < lot.endsAt.getTime()) {
    return { settle: false, reason: 'NOT_ENDED' };
  }
  return null;
}
