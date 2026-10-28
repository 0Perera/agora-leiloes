import { Link } from 'react-router';
import type { LostBid } from '../../shared/api/types';
import { formatShortDate } from '../../shared/lib/date';
import { formatMoney } from '../../shared/lib/money';
import { lotLabel } from '../../shared/lib/roman';
import { NumCell, WorkCell } from './cells';
import { finalOf } from './my-bids';

export function Lost({ items }: { items: LostBid[] }) {
  if (items.length === 0)
    return (
      <p className="bids-empty" role="status">
        Nenhum lote ficou com outro licitante.
      </p>
    );

  return (
    <div
      className="bids-ledger"
      role="table"
      aria-label="Lotes não arrematados"
    >
      <div className="bids-row bids-row--lost bids-head" role="row">
        <div className="bids-num" role="columnheader">
          Nº
        </div>
        <div role="columnheader">Obra</div>
        <div role="columnheader">Valor final</div>
        <div role="columnheader">Seu maior lance</div>
        <div role="columnheader">Encerrou</div>
        <div role="columnheader">Ação</div>
      </div>
      {items.map((bid) => (
        <div key={bid.id} className="bids-row bids-row--lost" role="row">
          <NumCell number={bid.number} />
          <WorkCell id={bid.id} title={bid.title} artist={bid.artist} />
          <div className="bids-money" role="cell" data-label="Valor final">
            {finalOf(bid.amount)}
          </div>
          <div
            className="bids-money bids-money--muted"
            role="cell"
            data-label="Seu maior lance"
          >
            {formatMoney(bid.myBid)}
          </div>
          <div className="bids-date" role="cell" data-label="Encerrou">
            {formatShortDate(bid.settledAt)}
          </div>
          <div className="bids-action" role="cell" data-label="Ação">
            <Link
              className="ag-btn ag-btn--quiet bids-open"
              to={`/lots/${bid.id}`}
              aria-label={`Abrir sala do ${lotLabel(bid.number)}`}
            >
              Abrir sala
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
