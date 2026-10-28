import { Link } from 'react-router';
import { lotImageUrl } from '../../shared/api/client';
import type { WonBid } from '../../shared/api/types';
import { formatLongDate } from '../../shared/lib/date';
import { formatMoney } from '../../shared/lib/money';
import { lotLabel } from '../../shared/lib/roman';
import { LinkCopy } from '../../shared/ui/link-copy';

export function Won({ items }: { items: WonBid[] }) {
  if (items.length === 0)
    return (
      <p className="bids-empty" role="status">
        Você ainda não arrematou nenhum lote.
      </p>
    );

  return (
    <div className="bids-plaques">
      {items.map((bid) => (
        <Plaque key={bid.id} bid={bid} />
      ))}
    </div>
  );
}

function Plaque({ bid }: { bid: WonBid }) {
  const receipt = `/receipts/${bid.receiptToken}`;
  return (
    <article
      className="bids-plaque"
      aria-label={`${lotLabel(bid.number)}, arrematado`}
    >
      <span className="bids-plaque__tag">Arrematado</span>
      <div className="bids-plaque__wall">
        <img
          className="bids-plaque__image"
          src={lotImageUrl(bid.id)}
          alt={`Imagem de ${bid.title}`}
          loading="lazy"
        />
      </div>
      <div className="bids-plaque__body">
        <div>
          <p className="bids-plaque__lot">{lotLabel(bid.number)}</p>
          <h3 className="bids-plaque__title">{bid.title}</h3>
          <p className="bids-plaque__artist">{bid.artist}</p>
        </div>
        <div className="bids-plaque__facts">
          <div>
            <span className="ag-lot__label">Valor pago</span>
            <span className="bids-plaque__paid">{formatMoney(bid.amount)}</span>
          </div>
          <div>
            <span className="ag-lot__label">Arrematado em</span>
            <span className="bids-plaque__date">
              {formatLongDate(bid.settledAt)}
            </span>
          </div>
        </div>
        <div className="bids-plaque__actions">
          <Link className="ag-btn ag-btn--secondary" to={receipt}>
            Ver comprovante
          </Link>
          <LinkCopy
            url={`${window.location.origin}${receipt}`}
            label="Copiar link de compartilhamento"
            done="✓ Link copiado"
            className="ag-btn ag-btn--quiet bids-copy"
          />
        </div>
      </div>
    </article>
  );
}
