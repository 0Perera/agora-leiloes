import { lotImageUrl } from '../../shared/api/client';
import type { LotDetail } from '../../shared/api/types';
import { artworkType } from '../../shared/lib/artwork-type';
import { formatShortDate } from '../../shared/lib/date';
import { formatMoney } from '../../shared/lib/money';
import { lotLabel } from '../../shared/lib/roman';
import { RoomSummary } from './room-timing';

type Props = { lot: LotDetail; offset: number };

const badges = {
  live: { className: 'ag-badge ag-badge--live', text: 'Ao vivo' },
  scheduled: { className: 'ag-badge ag-badge--scheduled', text: 'Agendado' },
  ended: { className: 'ag-badge ag-badge--closed', text: 'Encerrado' },
};

export function RoomView({ lot, offset }: Props) {
  return (
    <div className="room">
      <RoomHead lot={lot} />
      <RoomSummary lot={lot} offset={offset} />
      <figure className="room__art">
        <div className="room-niche">
          <div className="room-niche__stage">
            <img
              className="room-niche__image"
              src={lotImageUrl(lot.id)}
              alt={`Imagem de ${lot.title}`}
            />
          </div>
        </div>
      </figure>
      <RoomInfo lot={lot} />
    </div>
  );
}

function RoomHead({ lot }: { lot: LotDetail }) {
  const badge = badges[lot.status];
  const byline = [lot.artist, lot.date].filter(Boolean).join(', ');

  return (
    <div className="room__head">
      <div className="room-tags">
        <span className={badge.className}>{badge.text}</span>
        <span className="room-kicker">{lotLabel(lot.number)}</span>
      </div>
      <h1 className="room-title">{lot.title}</h1>
      {byline && <p className="room-byline">{byline}</p>}
    </div>
  );
}

function RoomInfo({ lot }: { lot: LotDetail }) {
  const facts: [string, string][] = [
    ['Artista', lot.artist],
    ['Data', lot.date],
    ['Tipo', artworkType(lot.type)],
    ['Técnica', lot.technique],
    ['Dimensões', lot.measurements],
  ];

  return (
    <section className="room__info" aria-labelledby="room-info-title">
      <h2 id="room-info-title" className="room-subtitle">
        Sobre a obra e o lote
      </h2>
      <div className="ag-rule" />
      {lot.description && <p className="room-description">{lot.description}</p>}
      <dl className="room-dl">
        {facts
          .filter(([, value]) => value)
          .map(([term, value]) => (
            <Fact key={term} term={term} value={value} />
          ))}
        <Fact term="Lance inicial" value={formatMoney(lot.startingBid)} />
        <Fact term="Aumento mínimo" value={formatMoney(lot.increment)} />
        <Fact term="Início" value={formatShortDate(lot.startsAt)} />
        <Fact term="Fim previsto" value={formatShortDate(lot.endsAt)} />
      </dl>
    </section>
  );
}

function Fact({ term, value }: { term: string; value: string }) {
  return (
    <>
      <dt>{term}</dt>
      <dd>{value}</dd>
    </>
  );
}
