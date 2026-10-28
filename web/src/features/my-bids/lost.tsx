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
      {items.map((bid) => (
        <Plaque
          key={bid.id}
          id={bid.id}
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
              value: formatLongDate(bid.settledAt),
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
          <Link
            className="ag-btn ag-btn--quiet bids-audit"
            to={`/lots/${bid.id}/audit`}
            aria-label={`Auditar o ${lotLabel(bid.number)}`}
          >
            Auditar lote
          </Link>
        </Plaque>
      ))}
    </div>
  );
}
