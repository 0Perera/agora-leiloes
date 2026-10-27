import { Link, useParams } from 'react-router';
import { LoadError } from '../../shared/ui/load-error';
import { parseLotId } from './room-summary';
import { RoomView } from './room-view';
import { useRoom } from './use-room';
import './room.css';

export function RoomPage() {
  const id = parseLotId(useParams().id);
  if (id === null) return <RoomMissing />;
  return <LotRoom key={id} id={id} />;
}

function LotRoom({ id }: { id: number }) {
  const { room, retry, placed, missing } = useRoom(id);
  if (room.status === 'loading') return <RoomSkeleton />;
  if (room.status === 'missing') return <RoomMissing />;
  if (room.status === 'error') return <RoomError onRetry={retry} />;
  return <RoomView room={room} onPlaced={placed} onMissing={missing} />;
}

function RoomSkeleton() {
  return (
    <>
      <p className="sr-only" role="status">
        Carregando a sala do lote.
      </p>
      <div className="room" aria-hidden="true">
        <div className="room__head room-skel-head">
          <div className="skel room-skel--label" />
          <div className="skel room-skel--title" />
          <div className="skel room-skel--line" />
        </div>
        <div className="room__summary skel room-skel--summary" />
        <div className="room__art">
          <div className="room-niche">
            <div className="room-niche__stage">
              <div className="skel room-skel--art" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function RoomMissing() {
  return (
    <div className="room-missing" role="alert">
      <p className="room-kicker">Sala do lote</p>
      <h1 className="room-missing__title">Lote não encontrado</h1>
      <p className="room-missing__text">
        Este lote não existe ou foi cancelado pelo leiloeiro antes de receber
        lances.
      </p>
      <Link className="ag-btn ag-btn--secondary" to="/">
        Voltar à vitrine
      </Link>
    </div>
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
