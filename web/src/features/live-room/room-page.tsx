import { Link, useParams } from 'react-router';
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
  const { room, retry } = useRoom(id);
  if (room.status === 'loading') return <RoomSkeleton />;
  if (room.status === 'missing') return <RoomMissing />;
  if (room.status === 'error') return <RoomError onRetry={retry} />;
  return <RoomView lot={room.lot} offset={room.offset} />;
}

function RoomSkeleton() {
  return (
    <>
      <p className="sr-only" role="status">
        Carregando a sala do lote.
      </p>
      <div className="room" aria-hidden="true">
        <div className="room__head room-skel-head">
          <div className="room-skel room-skel--label" />
          <div className="room-skel room-skel--title" />
          <div className="room-skel room-skel--line" />
        </div>
        <div className="room__summary room-skel room-skel--summary" />
        <div className="room__art">
          <div className="room-niche">
            <div className="room-niche__stage">
              <div className="room-skel room-skel--art" />
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
    <div className="room-error" role="alert">
      <div className="ag-notice ag-notice--error">
        <span className="ag-notice__mark" aria-hidden="true">
          ✕
        </span>
        <p className="ag-notice__title">
          Não foi possível abrir a sala do lote
        </p>
        <p className="ag-notice__text">
          Não conseguimos abrir a sala agora. Nenhum lance seu foi enviado ou
          perdido.
        </p>
      </div>
      <div className="room-error__actions">
        <button
          className="ag-btn ag-btn--secondary"
          type="button"
          onClick={onRetry}
        >
          Tentar de novo
        </button>
        <Link className="ag-btn ag-btn--quiet room-error__back" to="/">
          Voltar à vitrine
        </Link>
      </div>
    </div>
  );
}
