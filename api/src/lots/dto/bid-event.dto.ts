export class BidEventDto {
  seq!: number;
  amount!: number;
  alias!: string;
  createdAt!: Date;
  endsAt!: Date;
}

// Lista fechada: o stream é público, nada além destes campos pode sair nele.
export function toBidEvent(bid: BidEventDto): BidEventDto {
  return {
    seq: bid.seq,
    amount: bid.amount,
    alias: bid.alias,
    createdAt: bid.createdAt,
    endsAt: bid.endsAt,
  };
}
