import { timingSafeEqual } from 'node:crypto';
import { sign as signFields } from '../audit/sign';

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

export function verify(
  secret: string,
  receipt: ReceiptFields,
  signature: string,
): boolean {
  const expected = Buffer.from(sign(secret, receipt), 'hex');
  const given = Buffer.from(signature, 'hex');
  // Tamanhos diferentes fazem o timingSafeEqual lançar erro.
  return given.length === expected.length && timingSafeEqual(given, expected);
}
