import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import type { OngoingBid } from '../../shared/api/types';
import { secondsLeft } from '../../shared/lib/countdown';
import { formatMoney } from '../../shared/lib/money';
import { lotLabel } from '../../shared/lib/roman';
import { actionOf, finalOf, leftOf, standingOf } from './my-bids';
import { Plaque } from './plaque';
import type { Fact } from './plaque';

// /my-bids não traz serverTime: a contagem segue o relógio do navegador
function useNow(ticking: boolean): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!ticking) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [ticking]);

  return now;
}

export function Ongoing({ items }: { items: OngoingBid[] }) {
  const now = useNow(items.some((bid) => !bid.awaitingSettlement));

  if (items.length === 0)
    return (
      <p className="bids-empty" role="status">
        Nenhum lote em disputa agora. <Link to="/">Ver lotes ao vivo</Link>
      </p>
    );

  return (
    <div className="bids-plaques">
      {items.map((bid) => (
        <OngoingPlaque key={bid.id} bid={bid} now={now} />
      ))}
    </div>
  );
}

function OngoingPlaque({ bid, now }: { bid: OngoingBid; now: number }) {
  const standing = standingOf(bid);
  const seconds = secondsLeft(bid.endsAt, now, 0);
  const action = actionOf(bid, seconds);

  return (
    <Plaque
      id={bid.id}
      number={bid.number}
      title={bid.title}
      artist={bid.artist}
      tag={{
        text: standing.text,
        tone: standing.tone === 'winning' ? 'blue' : 'red',
      }}
      facts={[
        { label: 'Lance atual', value: finalOf(bid.currentBid) },
        {
          label: 'Seu lance',
          value:
            standing.tone === 'winning' ? 'é o atual' : formatMoney(bid.myBid),
          muted: true,
        },
        timeFact(bid.awaitingSettlement, seconds),
      ]}
    >
      <Link
        className={
          action === 'Cobrir lance'
            ? 'ag-btn ag-btn--primary bids-action'
            : 'ag-btn ag-btn--secondary bids-action'
        }
        to={`/lots/${bid.id}`}
        aria-label={`${action} no ${lotLabel(bid.number)}`}
      >
        {action}
      </Link>
    </Plaque>
  );
}

function timeFact(awaiting: boolean, seconds: number): Fact {
  const left = leftOf(awaiting, seconds);
  if (!awaiting)
    return { label: 'Encerra em', value: left.text, urgent: left.urgent };
  return {
    label: 'Encerra em',
    value: <span className="ag-badge ag-badge--closed">{left.text}</span>,
  };
}
