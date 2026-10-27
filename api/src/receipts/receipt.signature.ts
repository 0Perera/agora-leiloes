import { sign as signFields } from '../audit/chain';

export type ReceiptFields = {
  lotId: number;
  alias: string;
  amount: number;
  finalHash: string;
  settledAt: Date;
};

export function sign(secret: string, receipt: ReceiptFields): string {
  return signFields(secret, 'receipt', [
    receipt.lotId,
    receipt.alias,
    receipt.amount,
    receipt.finalHash,
    receipt.settledAt.toISOString(),
  ]);
}
