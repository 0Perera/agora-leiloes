import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import type { CommittedLot, Wallet } from '../../shared/api/types';
import { formatMoney } from '../../shared/lib/money';
import { lotLabel, toRoman } from '../../shared/lib/roman';
import { LoadError } from '../../shared/ui/load-error';
import { BalanceEquation } from './balance-equation';
import { DepositForm } from './deposit-form';
import { holdNote, moreLots } from './holds';
import { useWallet } from '../../shared/lib/use-wallet';
import './wallet.css';

export function WalletPage() {
  const state = useWallet();
  useOpenRefresh(state.status === 'ready', state.refresh);

  return (
    <div className="wallet-page">
      <div>
        <h1 className="wallet-title">Sua carteira</h1>
        <p className="wallet-lede">
          Saldo simulado. Nenhum valor real é cobrado.
        </p>
      </div>
      {state.status === 'error' && (
        <LoadError
          title="Não foi possível carregar sua carteira"
          text="Seu saldo e seus lances continuam registrados. Só a consulta falhou."
          onRetry={state.reload}
        />
      )}
      {state.status === 'loading' && <Loading />}
      {state.status === 'ready' && (
        <>
          <BalanceEquation wallet={state.wallet} />
          <div className="wallet-cols">
            <Holds wallet={state.wallet} />
            <DepositForm />
          </div>
        </>
      )}
    </div>
  );
}

// a carteira do cabeçalho pode estar velha; se ainda está carregando, a leitura já é nova
function useOpenRefresh(ready: boolean, refresh: () => void) {
  const stale = useRef(ready);

  useEffect(() => {
    if (stale.current) refresh();
  }, [refresh]);
}

function Holds({ wallet }: { wallet: Wallet }) {
  const more = moreLots(wallet.lotsTotal, wallet.lots.length);
  const [now] = useState(() => Date.now());

  return (
    <section className="wallet-holds" aria-labelledby="hold-title">
      <h2 id="hold-title" className="wallet-holds-title">
        Onde seu saldo está comprometido
      </h2>
      <p className="wallet-holds-lede">
        Enquanto você lidera um lote, o valor do lance fica reservado. Se for
        superado, ele volta na hora para o disponível.
      </p>
      {wallet.lots.length === 0 ? (
        <p className="wallet-holds-empty">
          Nenhum valor comprometido. Todo o seu saldo está livre para lances.
        </p>
      ) : (
        <ul className="wallet-hold-list">
          {wallet.lots.map((lot) => (
            <HoldRow key={lot.id} lot={lot} now={now} />
          ))}
        </ul>
      )}
      {more && <p className="wallet-holds-more">{more}</p>}
    </section>
  );
}

function HoldRow({ lot, now }: { lot: CommittedLot; now: number }) {
  const roman = toRoman(lot.number);
  const note = holdNote(lot.endsAt, now);

  return (
    <li className="wallet-hold">
      <span className="wallet-hold-num">
        <span className="sr-only">{lotLabel(lot.number)}</span>
        <span aria-hidden="true">{roman ?? lot.number}</span>
        {roman && (
          <span className="wallet-hold-plain" aria-hidden="true">
            nº {lot.number}
          </span>
        )}
      </span>
      <span className="wallet-hold-main">
        <span className="wallet-hold-title">{lot.title}</span>
        <span className="wallet-hold-note">
          <span className="wallet-hold-lead">▲ {note.title}</span> ·{' '}
          {note.detail}
        </span>
      </span>
      <span className="wallet-hold-side">
        <span className="wallet-hold-amount">{formatMoney(lot.amount)}</span>
        <Link className="wallet-hold-link" to={`/lots/${lot.id}`}>
          Abrir sala do lote
        </Link>
      </span>
    </li>
  );
}

function Loading() {
  return (
    <>
      <p className="sr-only" role="status">
        Carregando sua carteira.
      </p>
      <div className="wallet-skeleton" aria-hidden="true">
        <div className="wallet-equation">
          {[1, 2, 3].map((term) => (
            <div key={term} className="wallet-term">
              <div className="skel wallet-skel--label" />
              <div className="skel wallet-skel--value" />
            </div>
          ))}
        </div>
        <div className="wallet-cols">
          <div className="wallet-skel-list">
            <div className="skel wallet-skel--title" />
            <div className="skel wallet-skel--row" />
            <div className="skel wallet-skel--row" />
            <div className="skel wallet-skel--row" />
          </div>
          <div className="skel wallet-skel--card" />
        </div>
      </div>
    </>
  );
}
