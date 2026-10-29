import { Link } from 'react-router';
import type { LostBid } from '../../shared/api/types';
import { formatLongDate } from '../../shared/lib/date';
import { formatMoney } from '../../shared/lib/money';
import { lotLabel } from '../../shared/lib/roman';
import { finalOf } from './my-bids';
import { Plaque } from './plaque';

export function Lost({ items }: { items: LostBid[] }) {
  if (items.length === 0)
    return (
      <p className="bids-empty" role="status">
        Nenhum lote ficou com outro licitante.
      </p>
    );

  return (
    <div className="bids-plaques">
      {items.map((bid) =>
        bid.cancelledAt ? (
          <CancelledPlaque key={bid.id} bid={bid} at={bid.cancelledAt} />
        ) : (
          <LostPlaque key={bid.id} bid={bid} />
        ),
      )}
    </div>
  );
}

function LostPlaque({ bid }: { bid: LostBid }) {
  return (
    <Plaque
      id={bid.id}
      artworkId={bid.artworkId}
      number={bid.number}
      title={bid.title}
      artist={bid.artist}
      tag={{ text: 'Não arrematado', tone: 'neutral' }}
      facts={[
        { label: 'Valor final', value: finalOf(bid.amount) },
        {
          label: 'Seu maior lance',
          value: formatMoney(bid.myBid),
          muted: true,
        },
        {
          label: 'Encerrou em',
          value: bid.settledAt ? formatLongDate(bid.settledAt) : '—',
          plain: true,
        },
      ]}
    >
      <Link
        className="ag-btn ag-btn--secondary bids-action"
        to={`/lots/${bid.id}`}
        aria-label={`Abrir sala do ${lotLabel(bid.number)}`}
      >
        Abrir sala
      </Link>
      <AuditLink bid={bid} />
    </Plaque>
  );
}

// a sala do lote cancelado dá 404: só a auditoria continua acessível
function CancelledPlaque({ bid, at }: { bid: LostBid; at: string }) {
  return (
    <Plaque
      id={bid.id}
      artworkId={bid.artworkId}
      number={bid.number}
      title={bid.title}
      artist={bid.artist}
      tag={{ text: 'Cancelado', tone: 'neutral' }}
      facts={[
        {
          label: 'Seu maior lance',
          value: formatMoney(bid.myBid),
          muted: true,
        },
        { label: 'Cancelado em', value: formatLongDate(at), plain: true },
      ]}
    >
      <AuditLink bid={bid} />
    </Plaque>
  );
}

function AuditLink({ bid }: { bid: LostBid }) {
  return (
    <Link
      className="ag-btn ag-btn--quiet bids-audit"
      to={`/lots/${bid.id}/audit`}
      aria-label={`Auditar o ${lotLabel(bid.number)}`}
    >
      Auditar lote
    </Link>
  );
}
