import { toWalletResponse } from './wallet-response.dto';

describe('walletResponseDto.toWalletResponse', () => {
  it('calcula o disponível como saldo menos comprometido', () => {
    expect(toWalletResponse({ balance: 5000, committed: 1500 })).toEqual({
      balance: 5000,
      committed: 1500,
      available: 3500,
    });
  });
});
