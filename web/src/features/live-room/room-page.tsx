import { Link, useParams } from 'react-router';
import { LoadError } from '../../shared/ui/load-error';
import { Niche } from '../../shared/ui/niche';
import { NotFound } from '../../shared/ui/not-found';
import { parseLotId } from '../../shared/lib/lot-number';
import { RoomView } from './room-view';
import { useRoom } from './use-room';
import './room.css';

export function RoomPage() {
  const id = parseLotId(useParams().id);
  if (id === null) return <RoomMissing />;
  return <LotRoom key={id} id={id} />;
}

function LotRoom({ id }: { id: number }) {
  const { room, connection, retry, placed, missing, older } = useRoom(id);
  if (room.status === 'loading') return <RoomSkeleton />;
  if (room.status === 'missing') return <RoomMissing />;
  if (room.status === 'error') return <RoomError onRetry={retry} />;
  return (
    <RoomView
      room={room}
      connection={connection}
      onPlaced={placed}
      onMissing={missing}
      onOlder={older}
    />
  );
}

function RoomSkeleton() {
  return (
    <>
      <p className="sr-only" role="status">
        Carregando a sala do lote.
      </p>
      <div className="room" aria-hidden="true">
        <div className="room__art">
          <Niche>
            <div className="skel room-skel--art" />
          </Niche>
        </div>
        <div className="room__main">
          <div className="room__head room-skel-head">
            <div className="skel room-skel--label" />
            <div className="skel room-skel--title" />
            <div className="skel room-skel--line" />
          </div>
          <div className="skel room-skel--summary" />
        </div>
      </div>
    </>
  );
}

function RoomMissing() {
  return (
    <NotFound
      kicker="Sala do lote"
      title="Lote não encontrado"
      text="Este lote não existe ou foi cancelado pelo leiloeiro antes de receber lances."
      back="Voltar à vitrine"
    />
  );
}

function RoomError({ onRetry }: { onRetry: () => void }) {
  return (
    <LoadError
      title="Não foi possível abrir a sala do lote"
      text="Não foi possível carregar o lote. Verifique a conexão e tente de novo."
      onRetry={onRetry}
      centered
    >
      <Link className="ag-btn ag-btn--quiet room-back" to="/">
        Voltar à vitrine
      </Link>
    </LoadError>
  );
}
