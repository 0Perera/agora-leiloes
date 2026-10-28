import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import type { OngoingBid } from '../../shared/api/types';
import { secondsLeft } from '../../shared/lib/countdown';
import { formatMoney } from '../../shared/lib/money';
import { lotLabel } from '../../shared/lib/roman';
import { NumCell, WorkCell } from './cells';
import { actionOf, finalOf, leftOf, standingOf } from './my-bids';

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
    <div className="bids-ledger" role="table" aria-label="Lotes em andamento">
      <div className="bids-row bids-row--ongoing bids-head" role="row">
        <div className="bids-num" role="columnheader">
          Nº
        </div>
        <div role="columnheader">Obra</div>
        <div role="columnheader">Situação</div>
        <div role="columnheader">Lance atual</div>
        <div role="columnheader">Seu lance</div>
        <div role="columnheader">Encerra em</div>
        <div role="columnheader">Ação</div>
      </div>
      {items.map((bid) => (
        <OngoingRow key={bid.id} bid={bid} now={now} />
      ))}
    </div>
  );
}

function OngoingRow({ bid, now }: { bid: OngoingBid; now: number }) {
  const standing = standingOf(bid);
  const winning = standing.tone === 'winning';
  const left = leftOf(bid.awaitingSettlement, secondsLeft(bid.endsAt, now, 0));
  const action = actionOf(bid);

  return (
    <div className="bids-row bids-row--ongoing" role="row">
      <NumCell number={bid.number} />
      <WorkCell id={bid.id} title={bid.title} artist={bid.artist} />
      <div role="cell" data-label="Situação">
        <span className={`bids-standing bids-standing--${standing.tone}`}>
          <span className="bids-standing__mark" aria-hidden="true">
            {standing.mark}
          </span>
          {standing.text}
        </span>
      </div>
      <div className="bids-money" role="cell" data-label="Lance atual">
        {finalOf(bid.currentBid)}
      </div>
      <div
        className="bids-money bids-money--muted"
        role="cell"
        data-label="Seu lance"
      >
        {winning ? 'é o atual' : formatMoney(bid.myBid)}
      </div>
      <div role="cell" data-label="Encerra em">
        <span className={leftClass(bid.awaitingSettlement, left.urgent)}>
          {left.text}
        </span>
      </div>
      <div className="bids-action" role="cell" data-label="Ação">
        <Link
          className={
            action === 'Cobrir lance'
              ? 'ag-btn ag-btn--primary bids-room'
              : 'ag-btn ag-btn--secondary bids-room'
          }
          to={`/lots/${bid.id}`}
          aria-label={`${action} no ${lotLabel(bid.number)}`}
        >
          {action}
        </Link>
      </div>
    </div>
  );
}

function leftClass(awaiting: boolean, urgent: boolean): string {
  if (awaiting) return 'bids-note';
  return urgent ? 'bids-money bids-money--urgent' : 'bids-money';
}
