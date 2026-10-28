import { Link } from 'react-router';
import { lotImageUrl } from '../../shared/api/client';
import type { LotCard as Lot, LotStatus } from '../../shared/api/types';
import { formatLeft, secondsLeft } from '../../shared/lib/countdown';
import { formatDay, formatShortDate } from '../../shared/lib/date';
import { formatMoney } from '../../shared/lib/money';
import { lotLabel } from '../../shared/lib/roman';

const urgentSeconds = 120;

const badges: Record<LotStatus, { className: string; text: string }> = {
  live: { className: 'ag-badge--live', text: 'Ao vivo' },
  scheduled: { className: 'ag-badge--scheduled', text: 'Agendado' },
  ended: { className: 'ag-badge--closed', text: 'Encerrado' },
};

type Facts = {
  priceLabel: string;
  price: string;
  timeLabel: string;
  time: string;
  urgent: boolean;
};

function liveFacts(lot: Lot, left: number): Facts {
  return {
    priceLabel: lot.currentBid === null ? 'Lance inicial' : 'Lance atual',
    price: formatMoney(lot.currentBid ?? lot.startingBid),
    timeLabel: liveTimeLabel(left),
    time: left > 0 ? formatLeft(left) : 'Encerrando',
    urgent: left < urgentSeconds,
  };
}

function liveTimeLabel(left: number): string {
  if (left <= 0) return 'Status';
  return left < urgentSeconds ? 'Últimos minutos' : 'Encerra em';
}

function scheduledFacts(lot: Lot): Facts {
  return {
    priceLabel: 'Lance inicial',
    price: formatMoney(lot.startingBid),
    timeLabel: 'Abre em',
    time: formatShortDate(lot.startsAt),
    urgent: false,
  };
}

function endedFacts(lot: Lot): Facts {
  const ended = { timeLabel: 'Encerrado em', time: formatDay(lot.endsAt) };
  if (lot.currentBid === null) {
    return {
      ...ended,
      priceLabel: 'Resultado',
      price: 'Sem lances',
      urgent: false,
    };
  }
  return {
    ...ended,
    priceLabel: 'Arrematado por',
    price: formatMoney(lot.currentBid),
    urgent: false,
  };
}

function factsOf(lot: Lot, now: number, offset: number): Facts {
  if (lot.status === 'live') {
    return liveFacts(lot, secondsLeft(lot.endsAt, now, offset));
  }
  return lot.status === 'scheduled' ? scheduledFacts(lot) : endedFacts(lot);
}

type Props = {
  lot: Lot;
  now: number;
  offset: number;
};

export function LotCard({ lot, now, offset }: Props) {
  const badge = badges[lot.status];
  const facts = factsOf(lot, now, offset);

  return (
    <article className="ag-lot lot-card">
      <div className="niche">
        <div className="niche__stage">
          <img
            className="niche__image"
            src={lotImageUrl(lot.id)}
            alt={`Imagem de ${lot.title}`}
            loading="lazy"
          />
        </div>
      </div>
      <div className="ag-lot__body">
        <div className="ag-lot__top">
          <p className="ag-lot__number">{lotLabel(lot.number)}</p>
          <span className={`ag-badge ${badge.className}`}>{badge.text}</span>
        </div>
        <h3 className="ag-lot__title">
          <Link className="lot-link" to={`/lots/${lot.id}`}>
            {lot.title}
          </Link>
        </h3>
        <p className="ag-lot__artist">{lot.artist}</p>
        <div className="ag-lot__meta">
          <div>
            <span className="ag-lot__label">{facts.priceLabel}</span>
            <span className="ag-lot__price">{facts.price}</span>
          </div>
          <div>
            <span className="ag-lot__label lot-card__time-label">
              {facts.timeLabel}
            </span>
            <span
              className={`ag-lot__time${facts.urgent ? ' ag-lot__time--urgent' : ''}`}
            >
              {facts.time}
            </span>
          </div>
        </div>
        <div className="lot-audit-slot">
          {lot.status !== 'scheduled' && (
            <Link className="lot-audit" to={`/lots/${lot.id}/audit`}>
              Auditar este lote
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
