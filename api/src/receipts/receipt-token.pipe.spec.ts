import { NotFoundException } from '@nestjs/common';
import { ReceiptTokenPipe } from './receipt-token.pipe';

const VALID = 'Ab0_-'.repeat(8) + 'xyz';

describe('ReceiptTokenPipe.transform', () => {
  it('aceita token de 43 caracteres base64url', () => {
    expect(new ReceiptTokenPipe().transform(VALID)).toBe(VALID);
  });

  it.each([
    ['42 caracteres', VALID.slice(1)],
    ['44 caracteres', `${VALID}a`],
    ['+', `+${VALID.slice(1)}`],
    ['/', `/${VALID.slice(1)}`],
    ['=', `${VALID.slice(1)}=`],
  ])('recusa token com %s', (_case, token) => {
    expect(() => new ReceiptTokenPipe().transform(token)).toThrow(
      NotFoundException,
    );
  });
});
