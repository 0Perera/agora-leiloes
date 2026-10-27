import { useState } from 'react';
import { api } from '../../shared/api/client';
import type {
  BookFilter,
  DashboardBook,
  DashboardLot,
} from '../../shared/api/types';
import { LedgerRow } from './ledger-row';
import type { Fresh } from './ledger-row';
import { LoadError } from '../../shared/ui/load-error';
import { cancelError } from './lot-errors';
import type { Notice } from './lot-errors';
import { Pager } from '../../shared/ui/pager';
import type { Load } from './use-dashboard';

const filters: { id: BookFilter; label: string; empty: string }[] = [
  { id: 'all', label: 'Todos', empty: 'no livro' },
  { id: 'live', label: 'Ao vivo', empty: 'ao vivo' },
  { id: 'scheduled', label: 'Agendados', empty: 'agendado' },
  { id: 'ended', label: 'Encerrados', empty: 'encerrado' },
  { id: 'cancelled', label: 'Cancelados', empty: 'cancelado' },
];

type Props = {
  state: Load<DashboardBook>;
  filter: BookFilter;
  fresh: Fresh | null;
  onFilter: (filter: BookFilter) => void;
  onTurn: (page: number) => void;
  onRetry: () => void;
  onChanged: () => void;
};

export function Ledger(props: Props) {
  const { state, filter } = props;
  const [refusal, setRefusal] = useState<Notice | null>(null);
  const counts = state.data?.counts;

  function choose(next: BookFilter) {
    setRefusal(null);
    props.onFilter(next);
  }

  function turn(page: number) {
    setRefusal(null);
    props.onTurn(page);
  }

  async function cancel(lot: DashboardLot) {
    setRefusal(null);
    try {
      await api.cancelLot(lot.id);
    } catch (caught) {
      setRefusal(cancelError(caught, lot.number));
    }
    props.onChanged();
  }

  return (
    <section className="panel-section" aria-labelledby="livro-title">
      <header className="ag-section panel-section-head">
        <h2 id="livro-title" className="ag-section__title panel-section-title">
          Livro de lotes
        </h2>
        <div className="ag-meander panel-section-meander" />
      </header>
      <div className="panel-filters" role="group" aria-label="Filtrar lotes">
        {filters.map((item) => (
          <button
            key={item.id}
            className="panel-tab"
            type="button"
            aria-pressed={filter === item.id}
            onClick={() => choose(item.id)}
          >
            {item.label}{' '}
            {counts && (
              <span className="panel-tab-count">({counts[item.id]})</span>
            )}
          </button>
        ))}
      </div>
      {refusal && (
        <div className="ag-notice ag-notice--info" role="alert">
          <span className="ag-notice__mark" aria-hidden="true">
            i
          </span>
          <p className="ag-notice__title">{refusal.title}</p>
          <p className="ag-notice__text">{refusal.text}</p>
        </div>
      )}
      <LedgerBody {...props} onTurn={turn} onCancel={cancel} />
    </section>
  );
}

type BodyProps = Props & { onCancel: (lot: DashboardLot) => Promise<void> };

function LedgerBody({
  state,
  filter,
  fresh,
  onRetry,
  onTurn,
  onCancel,
}: BodyProps) {
  if (state.status === 'error')
    return (
      <LoadError
        title="Não foi possível carregar seus lotes"
        text="Nada foi alterado. Os lotes ao vivo seguem recebendo lances normalmente."
        onRetry={onRetry}
      />
    );
  if (state.status === 'loading' || !state.data) return <LedgerSkeleton />;
  const book = state.data;
  if (book.items.length === 0)
    return <LedgerEmpty bookEmpty={book.counts.all === 0} filter={filter} />;

  return (
    <>
      <LedgerTable items={book.items} fresh={fresh} onCancel={onCancel} />
      <Pager
        page={book.page}
        pageSize={book.pageSize}
        total={book.total}
        label="Páginas do livro de lotes"
        onTurn={onTurn}
      />
    </>
  );
}

type TableProps = {
  items: DashboardLot[];
  onCancel: (lot: DashboardLot) => Promise<void>;
  fresh: Fresh | null;
};

function LedgerTable({ items, fresh, onCancel }: TableProps) {
  const [confirming, setConfirming] = useState<number | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  async function confirm(lot: DashboardLot) {
    setBusy(lot.id);
    await onCancel(lot);
    setBusy(null);
    setConfirming(null);
  }

  return (
    <div className="panel-ledger" role="table" aria-label="Livro de lotes">
      <div className="panel-lrow panel-lhead" role="row">
        <div className="panel-num" role="columnheader">
          Nº
        </div>
        <div role="columnheader">Obra</div>
        <div role="columnheader">Estado</div>
        <div role="columnheader">Lance inicial</div>
        <div role="columnheader">Resultado</div>
        <div role="columnheader">Lances</div>
        <div role="columnheader">Período</div>
        <div role="columnheader">Ação</div>
      </div>
      {items.map((lot) => (
        <LedgerRow
          key={lot.id}
          lot={lot}
          fresh={fresh?.id === lot.id ? fresh : null}
          confirming={confirming === lot.id}
          busy={busy === lot.id}
          onAsk={() => setConfirming(lot.id)}
          onKeep={() => setConfirming(null)}
          onConfirm={() => void confirm(lot)}
        />
      ))}
    </div>
  );
}

type EmptyProps = {
  bookEmpty: boolean;
  filter: BookFilter;
};

function LedgerEmpty({ bookEmpty, filter }: EmptyProps) {
  const name = filters.find((item) => item.id === filter)?.empty ?? '';

  return (
    <div className="panel-empty" role="status">
      <p className="panel-empty-title">
        {bookEmpty ? 'Seu livro de lotes está vazio' : `Nenhum lote ${name}`}
      </p>
      <p className="panel-empty-text">
        {bookEmpty
          ? 'Busque uma obra no acervo para criar seu primeiro lote.'
          : 'Escolha outro filtro ou crie um lote novo a partir do acervo.'}
      </p>
    </div>
  );
}

function LedgerSkeleton() {
  return (
    <>
      <p className="sr-only" role="status">
        Carregando o livro de lotes.
      </p>
      <div className="panel-ledger-skel" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((row) => (
          <div key={row} className="panel-ledger-skel-row">
            <div className="panel-skel panel-skel--num" />
            <div className="panel-skel panel-skel--thumb" />
            <div className="panel-ledger-skel-text">
              <div className="panel-skel panel-skel--line" />
              <div className="panel-skel panel-skel--short" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
