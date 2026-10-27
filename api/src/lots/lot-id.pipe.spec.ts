import { NotFoundException } from '@nestjs/common';
import { LotIdPipe } from './lot-id.pipe';

describe('LotIdPipe.transform', () => {
  it('recusa id não inteiro com 404', () => {
    expect(() => new LotIdPipe().transform('abc')).toThrow(NotFoundException);
  });

  it('recusa id acima do teto com 404', () => {
    expect(() => new LotIdPipe().transform('9999999999')).toThrow(
      NotFoundException,
    );
  });
});
