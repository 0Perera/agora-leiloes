import type { LotDetail } from '../../shared/api/types';
import { secondsLeft, splitLeft } from '../../shared/lib/countdown';
import { formatShortDate } from '../../shared/lib/date';
import { formatMoney } from '../../shared/lib/money';
import { countNote, summaryOf } from './room-summary';
import { useNow } from './use-room';

type Props = { lot: LotDetail; offset: number };

export function RoomSummary({ lot, offset }: Props) {
  const summary = summaryOf(lot);

  return (
    <section
      className="room__summary room-summary"
      aria-label="Lance atual e tempo restante"
    >
      <div>
        <span className="ag-lot__label">{summary.label}</span>
        <span className="room-price">{formatMoney(summary.amount)}</span>
        <span className="room-bids">{summary.bids}</span>
      </div>
      {lot.status === 'scheduled' ? (
        <RoomOpens startsAt={lot.startsAt} />
      ) : (
        <RoomCountdown lot={lot} offset={offset} />
      )}
    </section>
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

function RoomCountdown({ lot, offset }: Props) {
  const ended = lot.status === 'ended';
  const now = useNow(!ended);
  const seconds = ended ? 0 : secondsLeft(lot.endsAt, now, offset);
  const { first, second, inHours } = splitLeft(seconds);
  const note = countNote(ended, seconds);
  const urgent = note.urgent ? ' ag-countdown--urgent' : '';

  return (
    <div
      className={`ag-countdown${urgent}`}
      role="timer"
      aria-label="Tempo restante do lote"
    >
      <div className="ag-countdown__units">
        <Unit value={first} label={inHours ? 'Horas' : 'Min'} />
        <span className="ag-countdown__sep room-countdown__sep">:</span>
        <Unit value={second} label={inHours ? 'Min' : 'Seg'} />
      </div>
      <p className={note.urgent ? 'room-note room-note--urgent' : 'room-note'}>
        {note.text}
      </p>
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
