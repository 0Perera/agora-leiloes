import type { BidHistoryItem, LotDetail } from '../../shared/api/types';
import { formatMoney } from '../../shared/lib/money';

type Props = {
  lot: LotDetail;
  bids: BidHistoryItem[];
  total: number;
};

const timeFormat = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

export function RoomHistory({ lot, bids, total }: Props) {
  return (
    <section className="room__history" aria-labelledby="room-history-title">
      <h2 id="room-history-title" className="room-subtitle">
        Histórico de lances{' '}
        {total > 0 && <span className="room-history__count">({total})</span>}
      </h2>
      {bids.length > 0 ? (
        <ol className="room-history">
          {bids.map((bid, index) => (
            <HistoryRow
              key={bid.seq}
              bid={bid}
              mine={bid.alias === lot.me?.alias}
              leads={index === 0}
            />
          ))}
        </ol>
      ) : (
        <HistoryEmpty lot={lot} />
      )}
      <p className="room-history__note">
        Os participantes aparecem só por apelido. Todo lance fica registrado e
        pode ser conferido na auditoria pública.
      </p>
    </section>
  );
}

function HistoryRow({
  bid,
  mine,
  leads,
}: {
  bid: BidHistoryItem;
  mine: boolean;
  leads: boolean;
}) {
  return (
    <li className={mine ? 'room-history__row is-mine' : 'room-history__row'}>
      <span className="room-history__who">
        <span className="room-history__alias">{mine ? 'Você' : bid.alias}</span>
        {leads && <span className="room-history__leads">▲ Lidera</span>}
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
