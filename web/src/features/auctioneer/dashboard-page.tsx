import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import type { Artwork } from '../../shared/api/types';
import { CatalogSearch } from './catalog-search';
import { Ledger } from './ledger';
import { LotForm } from './lot-form';
import { Summary } from './summary';
import { useDashboard } from './use-dashboard';
import './auctioneer.css';

export function DashboardPage() {
  const dashboard = useDashboard();
  const [params, setParams] = useSearchParams();
  const showNew = params.has('new');

  function toggleNew(open: boolean) {
    setParams(open ? { new: '' } : {}, { replace: true });
  }

  return (
    <div className="panel-page">
      <section className="panel-intro" aria-labelledby="page-title">
        <div className="panel-intro-head">
          <div>
            <p className="panel-eyebrow">Livro da casa</p>
            <h1 id="page-title" className="panel-title">
              Painel do leiloeiro
            </h1>
            <p className="panel-lede">
              Lotes da Casa Ágora, do acervo ao arremate.
            </p>
          </div>
          <button
            className="ag-btn ag-btn--primary"
            type="button"
            onClick={() => toggleNew(!showNew)}
            aria-expanded={showNew}
            aria-controls="novo-lote"
          >
            {showNew ? 'Fechar novo lote' : 'Novo lote'}
          </button>
        </div>
        <Summary state={dashboard.summary} onRetry={dashboard.retrySummary} />
      </section>
      {showNew && <NewLot onCreated={dashboard.reload} />}
      <Ledger
        state={dashboard.book}
        filter={dashboard.filter}
        onFilter={dashboard.choose}
        onTurn={dashboard.turn}
        onRetry={dashboard.retryBook}
        onChanged={dashboard.reload}
        onOpenNew={() => toggleNew(true)}
      />
    </div>
  );
}

function NewLot({ onCreated }: { onCreated: () => void }) {
  const [artwork, setArtwork] = useState<Artwork | null>(null);

  useEffect(() => {
    document.getElementById('q')?.focus();
  }, []);

  return (
    <section
      id="novo-lote"
      className="panel-section"
      aria-labelledby="novo-title"
    >
      <header className="ag-section panel-section-head">
        <h2 id="novo-title" className="ag-section__title panel-section-title">
          Novo lote a partir do acervo
        </h2>
        <div className="ag-meander panel-section-meander" />
      </header>
      <CatalogSearch selected={artwork} onPick={setArtwork} />
      {artwork && (
        <LotForm key={artwork.id} artwork={artwork} onCreated={onCreated} />
      )}
    </section>
  );
}
