import type { BidHistoryItem, LotDetail } from '../../shared/api/types';
import { formatShortDate } from '../../shared/lib/date';
import { minimumOf, situationOf } from '../../shared/lib/live-bids';
import { BidSituation } from '../../shared/ui/bid-situation';
import { useWalletRefresh } from '../wallet/use-wallet-refresh';

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
