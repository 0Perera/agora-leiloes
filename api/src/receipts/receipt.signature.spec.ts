import { createHmac } from 'node:crypto';

import { sign } from '../common/sign';
import { ReceiptFields, signReceipt, verifyReceipt } from './receipt.signature';

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

describe('receiptSignature.signReceipt', () => {
  it('gera a mesma assinatura para o mesmo comprovante', () => {
    expect(signReceipt(SECRET, makeReceipt())).toBe(
      signReceipt(SECRET, makeReceipt()),
    );
  });

  it.each(CHANGES)(
    'muda a assinatura quando muda o campo %s',
    (_field, override) => {
      expect(signReceipt(SECRET, makeReceipt(override))).not.toBe(
        signReceipt(SECRET, makeReceipt()),
      );
    },
  );

  it('não coincide com um hash de lance de mesmo conteúdo', () => {
    const receipt = makeReceipt();

    expect(signReceipt(SECRET, receipt)).not.toBe(
      sign(SECRET, 'bid', [
        receipt.lotId,
        receipt.alias,
        receipt.amount,
        receipt.finalHash,
        receipt.settledAt.toISOString(),
      ]),
    );
  });

  it('confere com um HMAC montado à mão', () => {
    expect(signReceipt(SECRET, makeReceipt())).toBe(
      createHmac('sha256', SECRET)
        .update(
          `receipt:7|Licitante ABCDEF|150000|${'a'.repeat(64)}|2026-10-27T12:00:00.123Z`,
        )
        .digest('hex'),
    );
  });
});

describe('receiptSignature.verifyReceipt', () => {
  it('aceita comprovante intacto', () => {
    const receipt = makeReceipt();

    expect(verifyReceipt(SECRET, receipt, signReceipt(SECRET, receipt))).toBe(
      true,
    );
  });

  it.each(CHANGES)(
    'recusa comprovante com o campo %s alterado',
    (_field, override) => {
      const signature = signReceipt(SECRET, makeReceipt());

      expect(verifyReceipt(SECRET, makeReceipt(override), signature)).toBe(
        false,
      );
    },
  );
});
