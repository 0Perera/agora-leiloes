import { BalanceEquation } from './balance-equation';
import { DepositForm } from './deposit-form';
import { useWallet } from './use-wallet';
import './wallet.css';

export function WalletPage() {
  const state = useWallet();

  return (
    <div className="wallet-page">
      <div>
        <h1 className="wallet-title">Sua carteira</h1>
        <p className="wallet-lede">
          Saldo simulado. Nenhum valor real é cobrado.
        </p>
      </div>
      {state.status === 'error' && <LoadError onRetry={state.reload} />}
      {state.status === 'loading' && <Loading />}
      {state.status === 'ready' && (
        <>
          <BalanceEquation wallet={state.wallet} />
          <div className="cols">
            <Holds />
            <DepositForm />
          </div>
        </>
      )}
    </div>
  );
}

function Holds() {
  return (
    <section className="holds" aria-labelledby="hold-title">
      <h2 id="hold-title" className="holds-title">
        Onde seu saldo está comprometido
      </h2>
      <p className="holds-lede">
        Enquanto você lidera um lote, o valor do lance fica reservado. Se for
        superado, ele volta na hora para o disponível.
      </p>
      <p className="holds-empty">
        Nenhum valor comprometido. Todo o seu saldo está livre para lances.
      </p>
    </section>
  );
}

function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="wallet-error" role="alert">
      <div className="ag-notice ag-notice--error">
        <span className="ag-notice__mark" aria-hidden="true">
          ✕
        </span>
        <p className="ag-notice__title">
          Não foi possível carregar sua carteira
        </p>
        <p className="ag-notice__text">
          Seu saldo e seus lances continuam registrados. Só a consulta falhou.
        </p>
      </div>
      <button
        className="ag-btn ag-btn--secondary"
        type="button"
        onClick={onRetry}
      >
        Tentar de novo
      </button>
    </div>
  );
}

function Loading() {
  return (
    <>
      <p className="sr-only" role="status">
        Carregando sua carteira.
      </p>
      <div className="wallet-skeleton" aria-hidden="true">
        <div className="equation">
          {[1, 2, 3].map((term) => (
            <div key={term} className="term">
              <div className="skel skel--label" />
              <div className="skel skel--value" />
            </div>
          ))}
        </div>
        <div className="cols">
          <div className="skel-list">
            <div className="skel skel--title" />
            <div className="skel skel--row" />
            <div className="skel skel--row" />
            <div className="skel skel--row" />
          </div>
          <div className="skel skel--card" />
        </div>
      </div>
    </>
  );
}
