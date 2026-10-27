export class BidHistoryItemDto {
  seq!: number;
  alias!: string;
  amount!: number;
  createdAt!: Date;
}

export class BidHistoryDto {
  items!: BidHistoryItemDto[];
  page!: number;
  pageSize!: number;
  total!: number;
}

export type HistoryRow = {
  seq: number;
  userId: number;
  amount: number;
  createdAt: Date;
};

// user_id só serve para calcular o alias: nunca sai na resposta.
export function toHistoryItem(
  row: HistoryRow,
  alias: (userId: number) => string,
): BidHistoryItemDto {
  return {
    seq: row.seq,
    alias: alias(row.userId),
    amount: row.amount,
    createdAt: row.createdAt,
  };
}
