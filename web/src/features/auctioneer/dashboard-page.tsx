import { useEffect, useState } from 'react';
import type { Artwork, CreatedLot } from '../../shared/api/types';
import { CatalogSearch } from './catalog-search';
import { CreatedDialog } from './created-dialog';
import { Ledger } from './ledger';
import type { Fresh } from './ledger-row';
import { LotForm } from './lot-form';
import { Summary } from './summary';
import { useDashboard } from './use-dashboard';
import './auctioneer.css';

const freshMs = 4000;

export function DashboardPage() {
  const dashboard = useDashboard();
  const [fresh, setFresh] = useState<Fresh | null>(null);

  useEffect(() => {
    if (!fresh) return;
    const timer = setTimeout(() => setFresh(null), freshMs);
    return () => clearTimeout(timer);
  }, [fresh]);

  return (
    <div className="panel-page">
      <section className="panel-intro" aria-labelledby="page-title">
        <div>
          <p className="panel-eyebrow">Livro da casa</p>
          <h1 id="page-title" className="panel-title">
            Painel do leiloeiro
          </h1>
          <p className="panel-lede">
            Lotes da Casa Ágora, do acervo ao arremate.
          </p>
        </div>
        <Summary state={dashboard.summary} onRetry={dashboard.retrySummary} />
      </section>
      <NewLot onCreated={dashboard.showCreated} onClosed={setFresh} />
      <Ledger
        state={dashboard.book}
        filter={dashboard.filter}
        fresh={fresh}
        onFilter={dashboard.choose}
        onTurn={dashboard.turn}
        onRetry={dashboard.retryBook}
        onChanged={dashboard.reload}
      />
    </div>
  );
}

type NewLotProps = {
  onCreated: () => void;
  onClosed: (fresh: Fresh) => void;
};

function NewLot({ onCreated, onClosed }: NewLotProps) {
  const [artwork, setArtwork] = useState<Artwork | null>(null);
  const [created, setCreated] = useState<CreatedLot | null>(null);

  function publish(lot: CreatedLot) {
    setCreated(lot);
    onCreated();
  }

  function close(lot: CreatedLot, reveal: boolean) {
    setCreated(null);
    setArtwork(null);
    onClosed({ id: lot.id, reveal });
    if (!reveal) document.getElementById('q')?.focus();
  }

  return (
    <section className="panel-section" aria-labelledby="novo-title">
      <header className="ag-section panel-section-head">
        <h2 id="novo-title" className="ag-section__title panel-section-title">
          Novo lote a partir do acervo
        </h2>
        <div className="ag-meander panel-section-meander" />
      </header>
      <CatalogSearch selected={artwork} onPick={setArtwork} />
      {artwork && (
        <LotForm key={artwork.id} artwork={artwork} onCreated={publish} />
      )}
      {created && (
        <CreatedDialog
          lot={created}
          onClose={(reveal) => close(created, reveal)}
        />
      )}
    </section>
  );
}
