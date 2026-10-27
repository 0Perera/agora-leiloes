import { useEffect, useRef } from 'react';
import type { BidHistoryItem, LotDetail } from '../../shared/api/types';
import { formatShortDate } from '../../shared/lib/date';
import { formatMoney } from '../../shared/lib/money';
import { useWallet } from '../wallet/use-wallet';
import { minimumOf, situationOf } from './room-bids';
import type { Situation } from './room-bids';

type Props = {
  lot: LotDetail;
  me: NonNullable<LotDetail['me']>;
  top: BidHistoryItem | undefined;
};

export function RoomOpening({ startsAt }: { startsAt: string }) {
  return (
    <div className="room__status">
      <p className="room-plain">
        Este lote ainda não começou. Abre em {formatShortDate(startsAt)}.
      </p>
    </div>
  );
}

export function RoomSituation({ lot, me, top }: Props) {
  const situation = situationOf(me, top);
  useWalletRefresh(situation);

  return (
    <div className="room__status">
      {situation === 'winning' && (
        <div className="ag-bidstatus ag-bidstatus--winning" role="status">
          <span className="ag-bidstatus__mark" aria-hidden="true">
            ▲
          </span>
          <div>
            <p className="ag-bidstatus__title">Você está ganhando</p>
            <p className="ag-bidstatus__text">
              O valor fica reservado na sua carteira enquanto você liderar.
            </p>
          </div>
        </div>
      )}
      {situation === 'outbid' && (
        <div className="ag-bidstatus ag-bidstatus--outbid" role="status">
          <span className="ag-bidstatus__mark" aria-hidden="true">
            ▼
          </span>
          <div>
            <p className="ag-bidstatus__title">Você foi superado</p>
            <p className="ag-bidstatus__text">
              Para cobrir, ofereça ao menos {formatMoney(minimumOf(lot))}.
            </p>
          </div>
        </div>
      )}
      {situation === 'none' && (
        <p className="room-plain room-plain--muted">
          Você ainda não deu lance neste lote.
        </p>
      )}
    </div>
  );
}

// a situação muda o comprometido: relê a carteira sem piscar o resumo do cabeçalho
function useWalletRefresh(situation: Situation) {
  const { refresh } = useWallet();
  const previous = useRef(situation);

  useEffect(() => {
    if (previous.current === situation) return;
    previous.current = situation;
    refresh();
  }, [situation, refresh]);
}
