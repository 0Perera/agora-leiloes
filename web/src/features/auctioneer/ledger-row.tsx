import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { lotImageUrl } from '../../shared/api/client';
import type { DashboardLot } from '../../shared/api/types';
import { formatShortDate } from '../../shared/lib/date';
import { formatMoney } from '../../shared/lib/money';
import { lotLabel, toRoman } from '../../shared/lib/roman';
import { StatusBadge } from '../../shared/ui/status-badge';
import { receiptOf, resultOf } from './ledger-result';

export type Fresh = { id: number; reveal: boolean };

type Props = {
  lot: DashboardLot;
  fresh: Fresh | null;
  confirming: boolean;
  busy: boolean;
  onAsk: () => void;
  onKeep: () => void;
  onConfirm: () => void;
};

function rowClass(cancelled: boolean, fresh: boolean): string {
  const classes = ['panel-lrow'];
  if (cancelled) classes.push('is-cancelled');
  if (fresh) classes.push('is-fresh');
  return classes.join(' ');
}

function reveal(row: HTMLElement) {
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  row.scrollIntoView({ block: 'center', behavior: still ? 'auto' : 'smooth' });
  row.focus({ preventScroll: true });
}

export function LedgerRow({ lot, fresh, ...actions }: Props) {
  const cancelled = lot.status === 'cancelled';
  const row = useRef<HTMLDivElement>(null);
  const revealed = fresh?.reveal ?? false;

  useEffect(() => {
    if (revealed && row.current) reveal(row.current);
  }, [revealed]);

  return (
    <div
      ref={row}
      className={rowClass(cancelled, fresh !== null)}
      role="row"
      tabIndex={fresh ? -1 : undefined}
    >
      <div className="panel-num" role="cell" aria-label={lotLabel(lot.number)}>
        <span aria-hidden="true">{toRoman(lot.number) ?? lot.number}</span>
        {toRoman(lot.number) && (
          <span className="panel-num-plain" aria-hidden="true">
            nº {lot.number}
          </span>
        )}
      </div>
      <div className="panel-obra" role="cell">
        <span className="panel-thumb" aria-hidden="true">
          <img
            className="panel-thumb-image"
            src={lotImageUrl(lot.id)}
            alt=""
            loading="lazy"
          />
        </span>
        <span className="panel-obra-text">
          <span className="panel-obra-title">{lot.title}</span>
          <span className="panel-obra-artist">{lot.artist}</span>
        </span>
      </div>
      <div role="cell" data-label="Estado">
        {lot.status === 'cancelled' ? (
          <span className="sr-only">Cancelado</span>
        ) : (
          <StatusBadge status={lot.status} />
        )}
      </div>
      {cancelled ? (
        <div className="panel-stamp-cell" role="cell">
          <span className="panel-stamp" aria-hidden="true">
            Cancelado
          </span>
        </div>
      ) : (
        <Figures lot={lot} />
      )}
      <div role="cell" data-label="Ação" className="panel-action">
        <Action lot={lot} {...actions} />
      </div>
    </div>
  );
}

function Figures({ lot }: { lot: DashboardLot }) {
  const result = resultOf(lot);

  return (
    <>
      <div className="panel-money" role="cell" data-label="Lance inicial">
        {formatMoney(lot.startingBid)}
      </div>
      <div role="cell" data-label="Resultado">
        <span className="panel-result-cell">
          <span
            className={
              result.muted ? 'panel-money panel-money--muted' : 'panel-money'
            }
          >
            {result.text}
          </span>
          {result.sub && (
            <span className="panel-sub">
              {result.sub}
              {result.who && (
                <>
                  {' '}
                  <span className="panel-who">{result.who}</span>
                </>
              )}
            </span>
          )}
        </span>
      </div>
      <div className="panel-money" role="cell" data-label="Lances">
        {lot.bidCount}
      </div>
      <div className="panel-period" role="cell" data-label="Período">
        {periodOf(lot)}
      </div>
    </>
  );
}

function periodOf(lot: DashboardLot): string {
  const starts = formatShortDate(lot.startsAt);
  const ends = formatShortDate(lot.endsAt);
  if (lot.status === 'live') return `até ${ends}`;
  if (lot.status === 'ended') return `encerrou ${ends}`;
  return `${starts} até ${ends}`;
}

type ActionProps = Omit<Props, 'lot' | 'fresh'> & { lot: DashboardLot };

function Action({
  lot,
  confirming,
  busy,
  onAsk,
  onKeep,
  onConfirm,
}: ActionProps) {
  if (lot.status === 'cancelled')
    return <span className="panel-sub">Fora da vitrine.</span>;
  const receipt = receiptOf(lot);
  if (receipt) return <ReceiptLink lot={lot} token={receipt} />;
  const cancellable = lot.status !== 'ended' && lot.bidCount === 0;
  if (!cancellable || !confirming)
    return (
      <span className="panel-actions">
        <Link
          className="ag-btn ag-btn--quiet panel-open"
          to={`/lots/${lot.id}`}
          aria-label={`Abrir sala do ${lotLabel(lot.number)}`}
        >
          Abrir sala
        </Link>
        {cancellable && (
          <button className="panel-cancel" type="button" onClick={onAsk}>
            Cancelar lote
          </button>
        )}
      </span>
    );

  return (
    <span
      className="panel-confirm"
      role="group"
      aria-label={`Confirmar cancelamento do ${lotLabel(lot.number)}`}
    >
      <span>Tirar o lote da vitrine?</span>
      <span className="panel-confirm-buttons">
        <button
          className="panel-cancel panel-cancel--confirm"
          type="button"
          disabled={busy}
          onClick={onConfirm}
        >
          {busy ? 'Cancelando…' : 'Sim, cancelar'}
        </button>
        <button
          className="ag-btn ag-btn--quiet panel-keep"
          type="button"
          disabled={busy}
          onClick={onKeep}
        >
          Manter
        </button>
      </span>
    </span>
  );
}

function ReceiptLink({ lot, token }: { lot: DashboardLot; token: string }) {
  return (
    <span className="panel-actions">
      <Link
        className="ag-btn ag-btn--quiet panel-open"
        to={`/receipts/${token}`}
        aria-label={`Ver comprovante do ${lotLabel(lot.number)}`}
      >
        Ver comprovante
      </Link>
    </span>
  );
}
