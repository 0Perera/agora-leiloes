export type BidLot = {
  startsAt: Date;
  endsAt: Date;
  startingBid: number;
  increment: number;
};

export type Movement = { userId: number; amount: number };

export type BidState = {
  lot: BidLot;
  last: Movement | null;
  userId: number;
  available: number;
  amount: number;
  now: Date;
};

type Refusal =
  | { accepted: false; code: 'LOT_NOT_STARTED'; startsAt: Date }
  | { accepted: false; code: 'LOT_ENDED' | 'ALREADY_WINNING' }
  | { accepted: false; code: 'BID_BELOW_MINIMUM'; minimum: number }
  | { accepted: false; code: 'INSUFFICIENT_BALANCE'; available: number };

type Acceptance = {
  accepted: true;
  commit: Movement;
  release: Movement | null;
};

export type BidDecision = Acceptance | Refusal;

export function decide(state: BidState): BidDecision {
  return refuse(state) ?? accept(state);
}

// O valor cheio do novo lance fica comprometido e o do líder anterior volta inteiro.
function accept({ last, userId, amount }: BidState): Acceptance {
  const release = last && { userId: last.userId, amount: last.amount };
  return { accepted: true, commit: { userId, amount }, release };
}

// A ordem define o código devolvido quando mais de uma checagem falharia.
function refuse(state: BidState): Refusal | null {
  return (
    checkStatus(state) ??
    checkLeader(state) ??
    checkAmount(state) ??
    checkBalance(state)
  );
}

// Início inclusivo e fim exclusivo, a mesma fronteira do STATUS_SQL.
function checkStatus({ lot, now }: BidState): Refusal | null {
  if (now.getTime() < lot.startsAt.getTime()) {
    return { accepted: false, code: 'LOT_NOT_STARTED', startsAt: lot.startsAt };
  }
  if (now.getTime() >= lot.endsAt.getTime()) {
    return { accepted: false, code: 'LOT_ENDED' };
  }
  return null;
}

function checkLeader({ last, userId }: BidState): Refusal | null {
  if (last?.userId === userId) {
    return { accepted: false, code: 'ALREADY_WINNING' };
  }
  return null;
}

function checkAmount({ lot, last, amount }: BidState): Refusal | null {
  const minimum = last ? last.amount + lot.increment : lot.startingBid;
  if (amount < minimum) {
    return { accepted: false, code: 'BID_BELOW_MINIMUM', minimum };
  }
  return null;
}

function checkBalance({ available, amount }: BidState): Refusal | null {
  if (amount > available) {
    return { accepted: false, code: 'INSUFFICIENT_BALANCE', available };
  }
  return null;
}
