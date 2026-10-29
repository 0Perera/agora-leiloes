import type { Bidder } from './accounts';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// R$ 1 milhão por licitante: cobre todos os lances do plano.
export const DEPOSIT = 100_000_000;

export const SETTLE_DELAY = MINUTE;

// after: tempo desde o início do lote.
export type BidPlan = { bidder: Bidder; amount: number; after: number };

// startsIn: tempo desde a execução do seed (negativo = no passado).
export type LotPlan = {
  artworkId: number;
  startingBid: number;
  increment: number;
  startsIn: number;
  duration: number;
  bids: BidPlan[];
  cancelAfter?: number;
  settle?: boolean;
  tamper?: { seq: number; amount: number };
};

function alternate(
  first: Bidder,
  count: number,
  { startingBid, increment }: Pick<LotPlan, 'startingBid' | 'increment'>,
): BidPlan[] {
  const second: Bidder = first === 'geovanna' ? 'felipe' : 'geovanna';
  return Array.from({ length: count }, (_, index) => ({
    bidder: index % 2 === 0 ? first : second,
    amount: startingBid + index * increment,
    after: (index + 1) * 6 * HOUR,
  }));
}

const CONTESTED = { startingBid: 8_000_000, increment: 500_000 };
const LED_BY_GEOVANNA = { startingBid: 6_000_000, increment: 250_000 };
const LED_BY_FELIPE = { startingBid: 5_000_000, increment: 250_000 };
const SOLD_TO_GEOVANNA = { startingBid: 4_000_000, increment: 200_000 };
const SOLD_TO_FELIPE = { startingBid: 3_500_000, increment: 250_000 };
const TAMPERED = { startingBid: 5_000_000, increment: 250_000 };

// IDs conferidos na API da Cleveland: todos com imagem e de um dos dois departamentos.
export const LOTS: LotPlan[] = [
  {
    artworkId: 148758,
    ...CONTESTED,
    startsIn: -3 * DAY,
    duration: 10 * DAY,
    bids: alternate('felipe', 8, CONTESTED),
  },
  {
    artworkId: 124089,
    ...LED_BY_GEOVANNA,
    startsIn: -3 * DAY + 2 * HOUR,
    duration: 11 * DAY,
    bids: alternate('geovanna', 3, LED_BY_GEOVANNA),
  },
  {
    artworkId: 135661,
    ...LED_BY_FELIPE,
    startsIn: -3 * DAY + 4 * HOUR,
    duration: 12 * DAY,
    bids: alternate('geovanna', 2, LED_BY_FELIPE),
  },
  {
    artworkId: 105967,
    startingBid: 3_000_000,
    increment: 100_000,
    startsIn: -3 * DAY + 6 * HOUR,
    duration: 12 * DAY,
    bids: [],
  },
  {
    artworkId: 150389,
    startingBid: 7_000_000,
    increment: 500_000,
    startsIn: 5 * DAY,
    duration: 7 * DAY,
    bids: [],
  },
  {
    artworkId: 142277,
    startingBid: 1_500_000,
    increment: 100_000,
    startsIn: 6 * DAY,
    duration: 7 * DAY,
    bids: [],
  },
  {
    artworkId: 160885,
    ...SOLD_TO_GEOVANNA,
    startsIn: -20 * DAY,
    duration: 7 * DAY,
    bids: alternate('felipe', 4, SOLD_TO_GEOVANNA),
    settle: true,
  },
  {
    artworkId: 145463,
    ...SOLD_TO_FELIPE,
    startsIn: -18 * DAY,
    duration: 7 * DAY,
    bids: alternate('geovanna', 4, SOLD_TO_FELIPE),
    settle: true,
  },
  {
    artworkId: 130360,
    startingBid: 2_000_000,
    increment: 100_000,
    startsIn: -16 * DAY,
    duration: 7 * DAY,
    bids: [],
    settle: true,
  },
  {
    artworkId: 138359,
    startingBid: 2_500_000,
    increment: 100_000,
    startsIn: -12 * DAY,
    duration: 7 * DAY,
    bids: [],
    cancelAfter: DAY,
  },
  {
    artworkId: 128391,
    ...TAMPERED,
    startsIn: -25 * DAY,
    duration: 7 * DAY,
    bids: alternate('geovanna', 5, TAMPERED),
    settle: true,
    // Lance 3 (de R$ 55.000) reescrito para R$ 30.000 direto no banco.
    tamper: { seq: 3, amount: 3_000_000 },
  },
];
