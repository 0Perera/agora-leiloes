import { splitLeft } from '../lib/countdown';

type Props = {
  seconds: number;
  urgent: boolean;
  place: 'home' | 'room';
};

export function Countdown({ seconds, urgent, place }: Props) {
  const { first, second, inHours } = splitLeft(seconds);

  return (
    <div
      className={urgent ? 'ag-countdown ag-countdown--urgent' : 'ag-countdown'}
      role="timer"
      aria-label="Tempo restante do lote"
    >
      <div className="ag-countdown__units">
        <Unit value={first} label={inHours ? 'Horas' : 'Min'} place={place} />
        <span className={`ag-countdown__sep ${place}-countdown__sep`}>:</span>
        <Unit value={second} label={inHours ? 'Min' : 'Seg'} place={place} />
      </div>
    </div>
  );
}

type UnitProps = { value: string; label: string; place: Props['place'] };

function Unit({ value, label, place }: UnitProps) {
  return (
    <div className="ag-countdown__unit">
      <span className={`ag-countdown__value ${place}-countdown__value`}>
        {value}
      </span>
      <span className="ag-countdown__label">{label}</span>
    </div>
  );
}
