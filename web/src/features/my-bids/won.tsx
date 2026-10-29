import { Link } from 'react-router';
import type { WonBid } from '../../shared/api/types';
import { formatLongDate } from '../../shared/lib/date';
import { formatMoney } from '../../shared/lib/money';
import { LinkCopy } from '../../shared/ui/link-copy';
import { Plaque } from './plaque';

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
        <WonPlaque key={bid.id} bid={bid} />
      ))}
    </div>
  );
}

function WonPlaque({ bid }: { bid: WonBid }) {
  const receipt = `/receipts/${bid.receiptToken}`;
  return (
    <Plaque
      id={bid.id}
      artworkId={bid.artworkId}
      number={bid.number}
      title={bid.title}
      artist={bid.artist}
      tag={{ text: 'Arrematado', tone: 'blue' }}
      facts={[
        { label: 'Valor pago', value: formatMoney(bid.amount), paid: true },
        {
          label: 'Arrematado em',
          value: formatLongDate(bid.settledAt),
          plain: true,
        },
      ]}
    >
      <Link className="ag-btn ag-btn--secondary bids-action" to={receipt}>
        Ver comprovante
      </Link>
      <LinkCopy
        url={`${window.location.origin}${receipt}`}
        label="Copiar link de compartilhamento"
        done="✓ Link copiado"
        className="ag-btn ag-btn--quiet bids-copy"
      />
    </Plaque>
  );
}
