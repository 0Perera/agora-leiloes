import { formatMoney } from '../../shared/lib/money';
import type { Wallet } from '../../shared/api/types';

export function BalanceEquation({ wallet }: { wallet: Wallet }) {
  const heldNote =
    wallet.committed > 0
      ? 'reservado nos lotes que você lidera'
      : 'nada reservado agora';

  return (
    <section className="wallet-balance" aria-labelledby="saldo-title">
      <h2 id="saldo-title" className="sr-only">
        Saldo
      </h2>
      <div className="wallet-equation" aria-live="polite">
        <div className="wallet-term">
          <span className="wallet-term-label">Saldo total</span>
          <span className="wallet-term-value">
            {formatMoney(wallet.balance)}
          </span>
          <span className="wallet-term-note">
            tudo o que você depositou, menos arremates
          </span>
        </div>
        <span className="wallet-op" aria-hidden="true">
          −
        </span>
        <div className="wallet-term">
          <span className="wallet-term-label">Comprometido</span>
          <span className="wallet-term-value wallet-term-value--held">
            {formatMoney(wallet.committed)}
          </span>
          <span className="wallet-term-note">{heldNote}</span>
        </div>
        <span className="wallet-op" aria-hidden="true">
          =
        </span>
        <div className="wallet-term">
          <span className="wallet-term-label">Disponível para lances</span>
          <span className="wallet-term-value wallet-term-value--free">
            {formatMoney(wallet.available)}
          </span>
          <span className="wallet-term-note">
            o maior lance que você pode dar agora
          </span>
        </div>
      </div>
    </section>
  );
}
