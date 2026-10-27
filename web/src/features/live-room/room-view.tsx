import { Link } from 'react-router';
import { useSession } from '../../app/use-session';
import { lotImageUrl } from '../../shared/api/client';
import type {
  BidEvent,
  BidHistoryItem,
  LotDetail,
} from '../../shared/api/types';
import { artworkType } from '../../shared/lib/artwork-type';
import { formatShortDate } from '../../shared/lib/date';
import { formatMoney } from '../../shared/lib/money';
import { lotLabel } from '../../shared/lib/roman';
import { BidForm } from './bid-form';
import { RoomHistory } from './room-history';
import { RoomOpening, RoomSituation } from './room-status';
import { RoomSummary } from './room-timing';
import type { Connection } from './connection';
import type { ReadyRoom } from './use-room';

type Props = {
  room: ReadyRoom;
  connection: Connection;
  onPlaced: (bid: BidEvent) => void;
  onMissing: () => void;
};

type Viewer = 'visitor' | 'auctioneer' | 'bidder';

const badges = {
  live: { className: 'ag-badge ag-badge--live', text: 'Ao vivo' },
  scheduled: { className: 'ag-badge ag-badge--scheduled', text: 'Agendado' },
  ended: { className: 'ag-badge ag-badge--closed', text: 'Encerrado' },
};

export function RoomView({ room, connection, onPlaced, onMissing }: Props) {
  const { lot } = room;
  const viewer = useViewer(lot);
  const open = lot.status !== 'ended';
  const offline = connection === 'lost';

  return (
    <>
      {offline && (
        <p className="room-connection" role="status">
          Conexão perdida. Reconectando…
        </p>
      )}
      <div className={layoutOf(lot, viewer)}>
        <RoomHead lot={lot} />
        <RoomSummary
          lot={lot}
          offset={room.offset}
          extended={room.extended}
          leader={leaderOf(lot, room.bids[0])}
        />
        <RoomStatus lot={lot} viewer={viewer} room={room} />
        {open && (
          <section className="room__form" aria-label="Dar lance">
            {viewer === 'bidder' && (
              <BidForm
                lot={lot}
                offline={offline}
                onPlaced={onPlaced}
                onMissing={onMissing}
              />
            )}
            {viewer === 'visitor' && <VisitorBox />}
            {viewer === 'auctioneer' && (
              <p className="room-aside">
                Leiloeiros acompanham os lotes, mas não dão lances.
              </p>
            )}
          </section>
        )}
        <RoomHistory lot={lot} bids={room.bids} total={room.total} />
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
        <RoomInfo lot={lot} extended={room.extended} />
      </div>
    </>
  );
}

function leaderOf(
  lot: LotDetail,
  top: BidHistoryItem | undefined,
): string | undefined {
  if (!top) return undefined;
  return top.alias === lot.me?.alias ? 'Você' : top.alias;
}

function useViewer(lot: LotDetail): Viewer {
  const { session } = useSession();
  if (session?.user.role === 'AUCTIONEER') return 'auctioneer';
  if (session?.user.role === 'BIDDER' && lot.me) return 'bidder';
  return 'visitor';
}

// sem bloco de situação, a área sai do grid para não sobrar espaço vazio
function layoutOf(lot: LotDetail, viewer: Viewer): string {
  if (lot.status === 'ended') return 'room room--closed';
  if (lot.status === 'live' && viewer !== 'bidder') return 'room room--watch';
  return 'room';
}

function RoomStatus({
  lot,
  viewer,
  room,
}: {
  lot: LotDetail;
  viewer: Viewer;
  room: ReadyRoom;
}) {
  if (lot.status === 'scheduled')
    return <RoomOpening startsAt={lot.startsAt} />;
  if (lot.status !== 'live' || viewer !== 'bidder' || !lot.me) return null;
  return <RoomSituation lot={lot} me={lot.me} top={room.bids[0]} />;
}

function VisitorBox() {
  return (
    <div className="room-visitor">
      <p className="room-visitor__text">
        Você pode acompanhar este lote ao vivo. Para dar lance, entre com uma
        conta de licitante.
      </p>
      <Link className="ag-btn ag-btn--primary room-visitor__link" to="/login">
        Entrar para dar lance
      </Link>
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

function RoomInfo({ lot, extended }: { lot: LotDetail; extended: boolean }) {
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
        <Fact
          term="Fim previsto"
          value={`${formatShortDate(lot.endsAt)}${extended ? ' (prorrogado)' : ''}`}
        />
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
