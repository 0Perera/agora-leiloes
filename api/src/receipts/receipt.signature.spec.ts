import { createHmac } from 'node:crypto';

import { sign as signFields } from '../audit/chain';
import { ReceiptFields, sign } from './receipt.signature';

const SECRET = 'test-secret-with-at-least-32-chars!';

function makeReceipt(override: Partial<ReceiptFields> = {}): ReceiptFields {
  return {
    lotId: 7,
    alias: 'Licitante ABCDEF',
    amount: 150_000,
    finalHash: 'a'.repeat(64),
    settledAt: new Date('2026-10-27T12:00:00.123Z'),
    ...override,
  };
}

const CHANGES: [string, Partial<ReceiptFields>][] = [
  ['lotId', { lotId: 8 }],
  ['alias', { alias: 'Licitante ABCDEG' }],
  ['amount', { amount: 150_001 }],
  ['finalHash', { finalHash: 'b'.repeat(64) }],
  ['settledAt', { settledAt: new Date('2026-10-27T12:00:00.124Z') }],
];

describe('receiptSignature.sign', () => {
  it('gera a mesma assinatura para o mesmo comprovante', () => {
    expect(sign(SECRET, makeReceipt())).toBe(sign(SECRET, makeReceipt()));
  });

  it.each(CHANGES)(
    'muda a assinatura quando muda o campo %s',
    (_field, override) => {
      expect(sign(SECRET, makeReceipt(override))).not.toBe(
        sign(SECRET, makeReceipt()),
      );
    },
  );

  it('não coincide com um hash de lance de mesmo conteúdo', () => {
    const receipt = makeReceipt();

    expect(sign(SECRET, receipt)).not.toBe(
      signFields(SECRET, 'bid', [
        receipt.lotId,
        receipt.alias,
        receipt.amount,
        receipt.finalHash,
        receipt.settledAt.toISOString(),
      ]),
    );
  });

  it('confere com um HMAC montado à mão', () => {
    expect(sign(SECRET, makeReceipt())).toBe(
      createHmac('sha256', SECRET)
        .update(
          `receipt:7|Licitante ABCDEF|150000|${'a'.repeat(64)}|2026-10-27T12:00:00.123Z`,
        )
        .digest('hex'),
    );
  });
});
