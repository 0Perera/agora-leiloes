import { DomainException } from '../common/domain.exception';
import { deposit, MAX_BALANCE, WalletState } from './wallet.rules';

function makeWallet(overrides: Partial<WalletState> = {}): WalletState {
  return { balance: 5000, committed: 0, ...overrides };
}

describe('deposit', () => {
  it('soma o valor ao saldo', () => {
    expect(deposit(makeWallet(), 10000).balance).toBe(15000);
  });

  it('aceita saldo exatamente no teto', () => {
    const wallet = makeWallet({ balance: MAX_BALANCE - 10000 });

    expect(deposit(wallet, 10000).balance).toBe(MAX_BALANCE);
  });

  it('recusa saldo acima do teto', () => {
    const wallet = makeWallet({ balance: 2_140_000_000 });

    expect(() => deposit(wallet, 10_000_000)).toThrow(
      new DomainException('BALANCE_LIMIT_EXCEEDED'),
    );
  });

  it('não altera o comprometido', () => {
    const wallet = makeWallet({ balance: 60000, committed: 50000 });

    const result = deposit(wallet, 10000);

    expect(result.committed).toBe(50000);
    expect(result.balance - result.committed).toBe(
      wallet.balance - wallet.committed + 10000,
    );
  });
});
