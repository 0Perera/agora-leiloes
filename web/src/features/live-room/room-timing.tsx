import type { LotDetail } from '../../shared/api/types';
import { secondsLeft } from '../../shared/lib/countdown';
import { formatShortDate } from '../../shared/lib/date';
import { formatMoney } from '../../shared/lib/money';
import { useNow } from '../../shared/lib/use-now';
import { Countdown } from '../../shared/ui/countdown';
import { awaitsSettlement, countNote, summaryOf } from './room-summary';

type SummaryProps = {
  lot: LotDetail;
  offset: number;
  extended: boolean;
  cancelled: boolean;
  leader?: string;
};

export function RoomSummary({
  lot,
  offset,
  extended,
  cancelled,
  leader,
}: SummaryProps) {
  const summary = summaryOf(lot);
  const live = lot.status === 'live' && !cancelled;
  const now = useNow(live);
  const seconds = live ? secondsLeft(lot.endsAt, now, offset) : Infinity;
  const note = countNote(lot.status === 'ended', seconds, extended);

  return (
    <div className="room__summary">
      <section
        className="room-summary"
        aria-label="Lance atual e tempo restante"
      >
        <div className="room-summary__bid">
          <span className="ag-lot__label">{summary.label}</span>
          <span className="room-price" aria-live="polite">
            {formatMoney(summary.amount)}
          </span>
          <span className="room-bids">
            {leader ? `${leader} · ${summary.bids}` : summary.bids}
          </span>
        </div>
        {!cancelled &&
          (lot.status === 'scheduled' ? (
            <RoomOpens startsAt={lot.startsAt} />
          ) : (
            <Countdown
              seconds={live ? seconds : 0}
              urgent={note.urgent}
              place="room"
            />
          ))}
      </section>
      {!cancelled && !awaitsSettlement(lot) && (
        <p
          className={note.urgent ? 'room-note room-note--urgent' : 'room-note'}
        >
          {note.text}
        </p>
      )}
    </div>
  );
}

function RoomOpens({ startsAt }: { startsAt: string }) {
  return (
    <div className="room-opens">
      <span className="ag-lot__label">Abre em</span>
      <span className="room-opens__date">{formatShortDate(startsAt)}</span>
      <span className="room-opens__note">
        Os lances só são aceitos a partir daí.
      </span>
    </div>
  );
}
