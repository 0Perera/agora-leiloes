import { Link } from 'react-router';
import { useSession } from '../../app/use-session';
import { lotImageUrl } from '../../shared/api/client';
import type {
  BidEvent,
  BidHistoryItem,
  LotDetail,
} from '../../shared/api/types';
import { artworkType } from '../../shared/lib/artwork-type';
import type { Connection } from '../../shared/lib/connection';
import { formatShortDate } from '../../shared/lib/date';
import { formatMoney } from '../../shared/lib/money';
import { lotLabel } from '../../shared/lib/roman';
import { Niche } from '../../shared/ui/niche';
import { StatusBadge } from '../../shared/ui/status-badge';
import { BidForm } from './bid-form';
import { olderPage } from './room-bids';
import { RoomHistory } from './room-history';
import {
  BidderStatus,
  CancelledStatus,
  EndedStatus,
  RoomOpening,
} from './room-status';
import { RoomSummary } from './room-timing';
import type { ReadyRoom } from './use-room';

type Props = {
  room: ReadyRoom;
  connection: Connection;
  onPlaced: (bid: BidEvent) => void;
  onMissing: () => void;
  onOlder: (page: number) => Promise<void>;
};

type Viewer = 'visitor' | 'auctioneer' | 'bidder';

export function RoomView({
  room,
  connection,
  onPlaced,
  onMissing,
  onOlder,
}: Props) {
  const { lot } = room;
  const viewer = useViewer(lot);
  const open = lot.status !== 'ended' && !room.cancelled;
  const offline = connection === 'lost';
  const page = olderPage(room);
  const older = page === null ? null : () => onOlder(page);

  return (
    <>
      {offline && (
        <p className="room-connection" role="status">
          Conexão perdida. Reconectando…
        </p>
      )}
      <div className="room">
        <figure className="room__art">
          <Niche>
            <img
              className="arch__image"
              src={lotImageUrl(lot.id, lot.artworkId)}
              alt={`Imagem de ${lot.title}`}
            />
          </Niche>
        </figure>
        <div className="room__main">
          <RoomHead lot={lot} cancelled={room.cancelled} />
          <RoomSummary
            lot={lot}
            offset={room.offset}
            extended={room.extended}
            cancelled={room.cancelled}
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
          <RoomHistory
            lot={lot}
            bids={room.bids}
            total={room.total}
            older={older}
          />
        </div>
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

function RoomStatus({
  lot,
  viewer,
  room,
}: {
  lot: LotDetail;
  viewer: Viewer;
  room: ReadyRoom;
}) {
  const top = room.bids[0];
  const bidder = viewer === 'bidder' ? lot.me : undefined;
  if (room.cancelled && !bidder) return <CancelledStatus lot={lot} top={top} />;
  if (lot.status === 'scheduled' && !room.cancelled)
    return <RoomOpening startsAt={lot.startsAt} />;
  if (bidder)
    return (
      <BidderStatus
        lot={lot}
        me={bidder}
        top={top}
        cancelled={room.cancelled}
      />
    );
  if (lot.status === 'ended') return <EndedStatus lot={lot} />;
  return null;
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

function RoomHead({ lot, cancelled }: { lot: LotDetail; cancelled: boolean }) {
  const byline = [lot.artist, lot.date].filter(Boolean).join(', ');

  return (
    <div className="room__head">
      <div className="room-tags">
        <StatusBadge status={cancelled ? 'cancelled' : lot.status} />
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
