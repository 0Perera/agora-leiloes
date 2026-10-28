import type { DashboardSummary } from '../../shared/api/types';
import { formatShortDate } from '../../shared/lib/date';
import { formatMoney } from '../../shared/lib/money';
import { LoadError } from '../../shared/ui/load-error';
import type { Load } from './use-dashboard';

type Props = {
  state: Load<DashboardSummary>;
  onRetry: () => void;
};

export function Summary({ state, onRetry }: Props) {
  if (state.status === 'error')
    return (
      <LoadError
        title="Não foi possível carregar o resumo"
        text="Nada foi alterado. Os lotes ao vivo seguem recebendo lances normalmente."
        onRetry={onRetry}
      />
    );
  if (state.status === 'loading' || !state.data) return <SummarySkeleton />;
  const { live, scheduled, ended, received } = state.data;
  const next = scheduled.nextStartsAt
    ? `Próximo: ${formatShortDate(scheduled.nextStartsAt)}`
    : 'Nenhum agendado';
  const unsold =
    ended.withoutBids === 1
      ? '1 fechou sem lances'
      : `${ended.withoutBids} fecharam sem lances`;

  return (
    <div className="panel-tabula">
      <Term
        label="Total recebido"
        value={formatMoney(received)}
        note="soma dos comprovantes dos lotes arrematados"
        total
      />
      <Term
        label="Ao vivo"
        value={live.count}
        note={`${formatMoney(live.currentBidTotal)} em lances agora`}
      />
      <Term label="Agendados" value={scheduled.count} note={next} />
      <Term label="Encerrados" value={ended.count} note={unsold} />
    </div>
  );
}

type TermProps = {
  label: string;
  value: number | string;
  note: string;
  total?: boolean;
};

function Term(props: TermProps) {
  const value = props.total
    ? 'panel-tabula-value panel-tabula-value--total'
    : 'panel-tabula-value';
  return (
    <div>
      <span className="ag-lot__label">{props.label}</span>
      <span className={value}>{props.value}</span>
      <span className="panel-tabula-note">{props.note}</span>
    </div>
  );
}

function SummarySkeleton() {
  return (
    <>
      <p className="sr-only" role="status">
        Carregando o resumo.
      </p>
      <div className="panel-tabula" aria-hidden="true">
        {[1, 2, 3, 4].map((term) => (
          <div key={term}>
            <div className="panel-skel panel-skel--label" />
            <div
              className={
                term === 1
                  ? 'panel-skel panel-skel--value panel-skel--total'
                  : 'panel-skel panel-skel--value'
              }
            />
          </div>
        ))}
      </div>
    </>
  );
}
