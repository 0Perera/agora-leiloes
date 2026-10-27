import { useState } from 'react';
import type { Artwork, CreatedLot } from '../../shared/api/types';
import { formatShortDate } from '../../shared/lib/date';
import { lotLabel } from '../../shared/lib/roman';
import { CatalogSearch } from './catalog-search';
import { Ledger } from './ledger';
import { LotForm } from './lot-form';
import { Summary } from './summary';
import { useDashboard } from './use-dashboard';
import './auctioneer.css';

export function DashboardPage() {
  const dashboard = useDashboard();

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
      <NewLot onCreated={dashboard.showCreated} />
      <Ledger
        state={dashboard.book}
        filter={dashboard.filter}
        onFilter={dashboard.choose}
        onTurn={dashboard.turn}
        onRetry={dashboard.retryBook}
        onChanged={dashboard.reload}
      />
    </div>
  );
}

function publishedText(lot: CreatedLot): string {
  return `${lotLabel(lot.number)} publicado. Ele aparece na vitrine como Agendado, abrindo em ${formatShortDate(lot.startsAt)}.`;
}

function NewLot({ onCreated }: { onCreated: () => void }) {
  const [artwork, setArtwork] = useState<Artwork | null>(null);
  const [published, setPublished] = useState<string | null>(null);

  function pick(next: Artwork) {
    setArtwork(next);
    setPublished(null);
  }

  function created(lot: CreatedLot) {
    setArtwork(null);
    setPublished(publishedText(lot));
    onCreated();
  }

  return (
    <section className="panel-section" aria-labelledby="novo-title">
      <header className="ag-section panel-section-head">
        <h2 id="novo-title" className="ag-section__title panel-section-title">
          Novo lote a partir do acervo
        </h2>
        <div className="ag-meander panel-section-meander" />
      </header>
      <div role="status">
        {published && (
          <p className="panel-success">
            <span aria-hidden="true">✓</span>
            <span>{published}</span>
          </p>
        )}
      </div>
      <CatalogSearch selected={artwork} onPick={pick} />
      {artwork && (
        <LotForm key={artwork.id} artwork={artwork} onCreated={created} />
      )}
    </section>
  );
}
