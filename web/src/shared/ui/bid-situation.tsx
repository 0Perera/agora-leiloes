import { formatMoney } from '../lib/money';
import type { Situation } from '../lib/live-bids';

type Props = {
  situation: Exclude<Situation, 'none'>;
  minimum: number;
};

export function BidSituation({ situation, minimum }: Props) {
  if (situation === 'winning') {
    return (
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
    );
  }
  return (
    <div className="ag-bidstatus ag-bidstatus--outbid" role="status">
      <span className="ag-bidstatus__mark" aria-hidden="true">
        ▼
      </span>
      <div>
        <p className="ag-bidstatus__title">Você foi superado</p>
        <p className="ag-bidstatus__text">
          Para cobrir, ofereça ao menos {formatMoney(minimum)}.
        </p>
      </div>
    </div>
  );
}
