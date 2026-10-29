import { useEffect, useRef } from 'react';
import { lotImageUrl } from '../../shared/api/client';
import type { CreatedLot } from '../../shared/api/types';
import { formatShortDate } from '../../shared/lib/date';
import { lotLabel } from '../../shared/lib/roman';

type Props = {
  lot: CreatedLot;
  onClose: (reveal: boolean) => void;
};

function stateText(lot: CreatedLot): string {
  if (Date.parse(lot.startsAt) > Date.now())
    return `Agendado, abre em ${formatShortDate(lot.startsAt)}`;
  return `Ao vivo, encerra em ${formatShortDate(lot.endsAt)}`;
}

export function CreatedDialog({ lot, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const reveal = useRef(false);

  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
  }, []);

  function finish(next: boolean) {
    reveal.current = next;
    dialog.current?.close();
  }

  return (
    <dialog
      ref={dialog}
      className="panel-corners panel-dialog"
      aria-labelledby="created-title"
      onClose={() => onClose(reveal.current)}
    >
      <h2 id="created-title" className="panel-dialog-title">
        {lotLabel(lot.number)} publicado
      </h2>
      <div className="panel-dialog-work">
        <span className="panel-thumb" aria-hidden="true">
          <img
            className="panel-thumb-image"
            src={lotImageUrl(lot.id, lot.artworkId)}
            alt=""
          />
        </span>
        <span className="panel-obra-text">
          <span className="panel-obra-title">{lot.title}</span>
          <span className="panel-obra-artist">{lot.artist}</span>
        </span>
      </div>
      <p className="panel-dialog-state">{stateText(lot)}</p>
      <div className="panel-dialog-actions">
        <button
          className="ag-btn ag-btn--primary"
          type="button"
          autoFocus
          onClick={() => finish(true)}
        >
          Ver no livro
        </button>
        <button
          className="ag-btn ag-btn--secondary"
          type="button"
          onClick={() => finish(false)}
        >
          Criar outro lote
        </button>
      </div>
    </dialog>
  );
}
