import type { BidHistoryItem, LotDetail } from '../../shared/api/types';
import { formatShortDate } from '../../shared/lib/date';
import { minimumOf, situationOf } from '../../shared/lib/live-bids';
import type { Situation } from '../../shared/lib/live-bids';
import { BidSituation, EndedSituation } from '../../shared/ui/bid-situation';
import { useWalletRefresh } from '../../shared/lib/use-wallet-refresh';
import { cancelledText } from './room-cancelled';
import { endedOf } from './room-ended';
import type { Ended } from './room-ended';

type Props = {
  lot: LotDetail;
  me: NonNullable<LotDetail['me']>;
  top: BidHistoryItem | undefined;
  cancelled: boolean;
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

// o mesmo componente antes e depois da virada: o ref da carteira precisa sobreviver a ela
export function BidderStatus({ lot, me, top, cancelled }: Props) {
  const situation = situationOf(me, top);
  const ended = lot.status === 'ended' ? endedOf(lot) : null;
  useWalletRefresh(walletKey(situation, ended, cancelled));

  if (cancelled) return <CancelledStatus lot={lot} top={top} />;
  if (ended) return <EndedBlock ended={ended} />;
  return (
    <div className="room__status">
      {situation === 'none' ? (
        <p className="room-plain room-plain--muted">
          Você ainda não deu lance neste lote.
        </p>
      ) : (
        <BidSituation situation={situation} minimum={minimumOf(lot)} />
      )}
    </div>
  );
}

// só o líder tinha comprometido no lote: é a carteira dele que muda no cancelamento
function walletKey(
  situation: Situation,
  ended: Ended | null,
  cancelled: boolean,
): string {
  if (cancelled && situation === 'winning') return 'cancelled';
  return ended ? `ended:${ended.outcome}` : `live:${situation}`;
}

export function CancelledStatus({
  lot,
  top,
}: {
  lot: Pick<LotDetail, 'me'>;
  top: BidHistoryItem | undefined;
}) {
  return (
    <div className="room__status" role="status">
      <p className="room-plain">{cancelledText(lot, top)}</p>
    </div>
  );
}

export function EndedStatus({ lot }: { lot: LotDetail }) {
  return <EndedBlock ended={endedOf(lot)} />;
}

function EndedBlock({ ended }: { ended: Ended }) {
  return (
    <div className="room__status">
      {ended.outcome === 'pending' ? (
        <p className="room-plain room-plain--muted">
          Lote encerrado, aguardando liquidação.
        </p>
      ) : (
        <EndedSituation {...ended} />
      )}
    </div>
  );
}
