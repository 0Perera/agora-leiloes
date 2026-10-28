import { useState } from 'react';
import { Link } from 'react-router';
import type { BidHistoryItem, LotDetail } from '../../shared/api/types';
import { formatMoney } from '../../shared/lib/money';
import { lotLabel } from '../../shared/lib/roman';
import { topMark } from './room-summary';

type Props = {
  lot: LotDetail;
  bids: BidHistoryItem[];
  total: number;
  older: (() => Promise<void>) | null;
};

const timeFormat = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

export function RoomHistory({ lot, bids, total, older }: Props) {
  return (
    <section className="room__history" aria-labelledby="room-history-title">
      <div className="room-history__head">
        <h2 id="room-history-title" className="room-subtitle">
          Histórico de lances{' '}
          {total > 0 && <span className="room-history__count">({total})</span>}
        </h2>
        <Link
          className="ag-btn ag-btn--quiet room-history__audit"
          to={`/lots/${lot.id}/audit`}
          aria-label={`Auditar o ${lotLabel(lot.number)}`}
        >
          Auditar este lote
        </Link>
      </div>
      {bids.length > 0 ? (
        <ol className="room-history">
          {bids.map((bid, index) => (
            <HistoryRow
              key={bid.seq}
              bid={bid}
              mine={bid.alias === lot.me?.alias}
              mark={index === 0 ? topMark(lot) : null}
            />
          ))}
        </ol>
      ) : (
        <HistoryEmpty lot={lot} />
      )}
      {older && <OlderButton load={older} />}
      <p className="room-history__note">
        Os participantes aparecem só por apelido. Todo lance fica registrado e
        pode ser conferido na auditoria pública.
      </p>
    </section>
  );
}

function OlderButton({ load }: { load: () => Promise<void> }) {
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  function click() {
    setLoading(true);
    setFailed(false);
    load().then(
      () => setLoading(false),
      () => {
        setLoading(false);
        setFailed(true);
      },
    );
  }

  return (
    <div className="room-history__more">
      <button
        className="ag-btn ag-btn--secondary"
        type="button"
        disabled={loading}
        onClick={click}
      >
        {loading ? 'Carregando…' : 'Ver lances anteriores'}
      </button>
      {failed && (
        <p className="room-history__more-error" role="alert">
          Não foi possível carregar os lances anteriores. Tente de novo.
        </p>
      )}
    </div>
  );
}

function HistoryRow({
  bid,
  mine,
  mark,
}: {
  bid: BidHistoryItem;
  mine: boolean;
  mark: string | null;
}) {
  return (
    <li className={mine ? 'room-history__row is-mine' : 'room-history__row'}>
      <span className="room-history__who">
        <span className="room-history__alias">{mine ? 'Você' : bid.alias}</span>
        {mark && <span className="room-history__leads">▲ {mark}</span>}
      </span>
      <span className="room-history__amount">{formatMoney(bid.amount)}</span>
      <span className="room-history__time">
        {timeFormat.format(new Date(bid.createdAt))}
      </span>
    </li>
  );
}

function HistoryEmpty({ lot }: { lot: LotDetail }) {
  return (
    <div className="room-history__empty">
      <p className="room-history__empty-title">Ainda não há lances</p>
      {lot.status !== 'ended' && (
        <p className="room-history__empty-text">
          O primeiro lance precisa ser de pelo menos{' '}
          {formatMoney(lot.startingBid)}. Seja o primeiro.
        </p>
      )}
    </div>
  );
}
