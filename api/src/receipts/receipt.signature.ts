import { timingSafeEqual } from 'node:crypto';
import { sign } from '../common/sign';

export type ReceiptFields = {
  lotId: number;
  alias: string;
  amount: number;
  finalHash: string;
  settledAt: Date;
};

export function signReceipt(secret: string, receipt: ReceiptFields): string {
  return sign(secret, 'receipt', [
    receipt.lotId,
    receipt.alias,
    receipt.amount,
    receipt.finalHash,
    receipt.settledAt.toISOString(),
  ]);
}

export function verifyReceipt(
  secret: string,
  receipt: ReceiptFields,
  signature: string,
): boolean {
  const expected = Buffer.from(signReceipt(secret, receipt), 'hex');
  const given = Buffer.from(signature, 'hex');
  // Tamanhos diferentes fazem o timingSafeEqual lançar erro.
  return given.length === expected.length && timingSafeEqual(given, expected);
}
