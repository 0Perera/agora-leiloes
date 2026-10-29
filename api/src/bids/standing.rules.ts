export type BidderTop = { userId: number; highest: number };

export type Standing = { highest: number; rank: number; bidders: number };

export function standing(tops: BidderTop[], userId: number): Standing | null {
  const mine = tops.find((top) => top.userId === userId);
  if (!mine) return null;
  const ahead = tops.filter((top) => top.highest > mine.highest).length;
  return { highest: mine.highest, rank: ahead + 1, bidders: tops.length };
}
