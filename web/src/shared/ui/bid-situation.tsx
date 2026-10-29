import { Link } from 'react-router';
import type { Standing } from '../api/types';
import { formatMoney } from '../lib/money';
import type { Situation } from '../lib/live-bids';
import './bid-situation.css';

type Props = {
  situation: Exclude<Situation, 'none'>;
  minimum: number;
  standing?: Standing;
};

export function BidSituation({ situation, minimum, standing }: Props) {
  const block = <SituationBlock situation={situation} minimum={minimum} />;
  if (!standing) return block;
  return (
    <div className="bid-situation">
      {block}
      <p className="bid-situation__standing">{standingText(standing)}</p>
    </div>
  );
}

function standingText({ highest, rank, bidders }: Standing): string {
  const noun = bidders === 1 ? 'licitante' : 'licitantes';
  return `Seu maior lance: ${formatMoney(highest)} · ${rank}º de ${bidders} ${noun}`;
}

function SituationBlock({ situation, minimum }: Omit<Props, 'standing'>) {
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

type EndedProps =
  | { outcome: 'won'; amount: number; token: string }
  | { outcome: 'closed'; text: string };

export function EndedSituation(props: EndedProps) {
  if (props.outcome === 'closed') {
    return (
      <div className="bid-closed" role="status">
        <span className="bid-closed__mark" aria-hidden="true">
          ◆
        </span>
        <p className="bid-closed__text">
          <strong className="bid-closed__lead">Lote encerrado.</strong>{' '}
          {props.text}
        </p>
      </div>
    );
  }
  return (
    <div className="ag-bidstatus ag-bidstatus--winning" role="status">
      <span className="ag-bidstatus__mark" aria-hidden="true">
        ✓
      </span>
      <div>
        <p className="ag-bidstatus__title">Você arrematou este lote</p>
        <p className="ag-bidstatus__text">
          {formatMoney(props.amount)} foram debitados da sua carteira.{' '}
          <Link className="bid-won__link" to={`/receipts/${props.token}`}>
            Ver comprovante
          </Link>
        </p>
      </div>
    </div>
  );
}
