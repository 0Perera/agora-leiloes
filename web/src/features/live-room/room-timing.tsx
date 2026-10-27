import type { LotDetail } from '../../shared/api/types';
import { secondsLeft, splitLeft } from '../../shared/lib/countdown';
import { formatShortDate } from '../../shared/lib/date';
import { formatMoney } from '../../shared/lib/money';
import { countNote, summaryOf } from './room-summary';
import { useNow } from './use-room';

type SummaryProps = {
  lot: LotDetail;
  offset: number;
  extended: boolean;
  leader?: string;
};

export function RoomSummary({ lot, offset, extended, leader }: SummaryProps) {
  const summary = summaryOf(lot);
  const live = lot.status === 'live';
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
        {lot.status === 'scheduled' ? (
          <RoomOpens startsAt={lot.startsAt} />
        ) : (
          <RoomCountdown seconds={live ? seconds : 0} urgent={note.urgent} />
        )}
      </section>
      <p className={note.urgent ? 'room-note room-note--urgent' : 'room-note'}>
        {note.text}
      </p>
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

function RoomCountdown({
  seconds,
  urgent,
}: {
  seconds: number;
  urgent: boolean;
}) {
  const { first, second, inHours } = splitLeft(seconds);

  return (
    <div
      className={urgent ? 'ag-countdown ag-countdown--urgent' : 'ag-countdown'}
      role="timer"
      aria-label="Tempo restante do lote"
    >
      <div className="ag-countdown__units">
        <Unit value={first} label={inHours ? 'Horas' : 'Min'} />
        <span className="ag-countdown__sep room-countdown__sep">:</span>
        <Unit value={second} label={inHours ? 'Min' : 'Seg'} />
      </div>
    </div>
  );
}

function Unit({ value, label }: { value: string; label: string }) {
  return (
    <div className="ag-countdown__unit">
      <span className="ag-countdown__value room-countdown__value">{value}</span>
      <span className="ag-countdown__label">{label}</span>
    </div>
  );
}
