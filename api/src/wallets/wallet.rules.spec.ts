import { DomainException } from '../common/domain.exception';
import { MAX_INT } from '../common/max-int';
import { deposit, WalletState } from './wallet.rules';

function makeWallet(override: Partial<WalletState> = {}): WalletState {
  return { balance: 500_000, committed: 0, ...override };
}

describe('walletRules.deposit', () => {
  it('soma o valor ao saldo', () => {
    expect(deposit(makeWallet(), 100_000).balance).toBe(600_000);
  });

  it('aceita saldo exatamente no teto', () => {
    const wallet = makeWallet({ balance: MAX_INT - 100_000 });

    expect(deposit(wallet, 100_000).balance).toBe(MAX_INT);
  });

  it('recusa saldo acima do teto', () => {
    const wallet = makeWallet({ balance: 2_140_000_000 });

    expect(() => deposit(wallet, 10_000_000)).toThrow(
      new DomainException('BALANCE_LIMIT_EXCEEDED'),
    );
  });

  it('não altera o comprometido', () => {
    const wallet = makeWallet({ balance: 600_000, committed: 500_000 });

    const result = deposit(wallet, 100_000);

    expect(result.committed).toBe(500_000);
    expect(result.balance - result.committed).toBe(
      wallet.balance - wallet.committed + 100_000,
    );
  });
});
