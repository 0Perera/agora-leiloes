export type BidderTop = { userId: number; highest: number };

export type Standing = { highest: number; rank: number; bidders: number };

export function standing(_tops: BidderTop[], _userId: number): Standing | null {
  throw new Error('not implemented');
}
