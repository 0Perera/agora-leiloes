import { useState } from 'react';
import { useParams } from 'react-router';
import type { LotAudit, LotStatus } from '../../shared/api/types';
import { formatMoney } from '../../shared/lib/money';
import { lotLabel } from '../../shared/lib/roman';
import { HashCopy } from '../../shared/ui/hash-copy';
import { LoadError } from '../../shared/ui/load-error';
import { NotFound } from '../../shared/ui/not-found';
import { parseLotId } from '../live-room/room-summary';
import { checkedText, countText, type Row, rowsOf, verdictOf } from './audit';
import { useAudit } from './use-audit';
import './audit.css';

const readmeUrl = 'https://github.com/0Perera/agora-leiloes#auditoria';

const badges: Record<LotStatus, { className: string; text: string }> = {
  live: { className: 'ag-badge--live', text: 'Ao vivo' },
  scheduled: { className: 'ag-badge--scheduled', text: 'Agendado' },
  ended: { className: 'ag-badge--closed', text: 'Encerrado' },
};

const timeFormat = new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

function formatTime(iso: string): string {
  const parts = timeFormat.formatToParts(new Date(iso));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? '';
  const month = part('month').replace('.', '');
  return `${part('day')} ${month}, ${part('hour')}:${part('minute')}:${part('second')}`;
}

export function AuditPage() {
  const id = parseLotId(useParams().id);
  if (id === null) return <AuditMissing />;
  return <AuditScreen key={id} id={id} />;
}

function AuditScreen({ id }: { id: number }) {
  const { state, retry, recheck } = useAudit(id);
  if (state.status === 'loading') return <AuditSkeleton />;
  if (state.status === 'missing') return <AuditMissing />;
  if (state.status === 'error')
    return (
      <LoadError
        title="Não foi possível fazer a auditoria"
        text="Não conseguimos fazer a verificação agora. Isso não indica nenhum problema no lote; tente de novo."
        onRetry={retry}
      />
    );
  return (
    <div className="audit">
      <AuditHead audit={state.audit} />
      <AuditVerdict
        audit={state.audit}
        checkedAt={state.checkedAt}
        checking={state.checking}
        onRecheck={recheck}
      />
      <AuditBids audit={state.audit} />
      <AuditHow />
    </div>
  );
}

function AuditHead({ audit }: { audit: LotAudit }) {
  const badge = badges[audit.status];
  return (
    <header className="audit-head">
      <p className="audit-head__kicker">
        Auditoria pública · {lotLabel(audit.number)}
      </p>
      <h1 className="audit-head__title">{audit.title}</h1>
      <p className="audit-head__meta">
        <span className={`ag-badge ${badge.className}`}>{badge.text}</span>
        {audit.artist} · {countText(audit.bids.length)}
      </p>
    </header>
  );
}

type VerdictProps = {
  audit: LotAudit;
  checkedAt: Date;
  checking: boolean;
  onRecheck: () => void;
};

function AuditVerdict({ audit, checkedAt, checking, onRecheck }: VerdictProps) {
  const verdict = verdictOf(audit);
  const tone = verdict.intact ? 'intact' : 'tampered';
  return (
    <section
      className={`audit-verdict audit-verdict--${tone}`}
      aria-labelledby="verdict-title"
      aria-live="polite"
    >
      <div className={`ag-seal ag-seal--${tone}`}>
        <div className="ag-seal__core">
          <span className="ag-seal__mark" aria-hidden="true">
            {verdict.intact ? '✓' : '✕'}
          </span>
          <span className="ag-seal__word">
            {verdict.intact ? 'Íntegro' : 'Adulterado'}
          </span>
        </div>
      </div>
      <div className="audit-verdict__body">
        <h2
          id="verdict-title"
          className={`audit-verdict__title${checking ? '' : ` audit-verdict__title--${tone}`}`}
        >
          {checking ? 'Verificando o histórico…' : verdict.title}
        </h2>
        <p className="audit-verdict__text">{verdict.text}</p>
        <div className="audit-verdict__check">
          <span className="audit-verdict__when">{checkedText(checkedAt)}</span>
          <button
            className="ag-btn ag-btn--secondary audit-verdict__again"
            type="button"
            disabled={checking}
            onClick={onRecheck}
          >
            {checking ? 'Verificando…' : 'Verificar de novo'}
          </button>
        </div>
      </div>
    </section>
  );
}

function AuditBids({ audit }: { audit: LotAudit }) {
  const [showCodes, setShowCodes] = useState(true);
  const rows = rowsOf(audit);
  const truncated = audit.result === 'truncated';
  return (
    <section className="audit-bids" aria-labelledby="bids-title">
      <div className="audit-bids__head">
        <h2 id="bids-title" className="audit-subtitle">
          Todos os lances
        </h2>
        {rows.length > 0 && (
          <button
            className="ag-btn ag-btn--quiet audit-quiet"
            type="button"
            onClick={() => setShowCodes((current) => !current)}
          >
            {showCodes ? 'Esconder códigos' : 'Mostrar códigos'}
          </button>
        )}
      </div>
      {rows.length === 0 && (
        <p className="audit-bids__empty">
          {truncated
            ? 'Nenhum lance aparece no histórico.'
            : 'Nenhum lance registrado.'}
        </p>
      )}
      {(rows.length > 0 || truncated) && (
        <div
          className={`audit-ledger${showCodes ? '' : ' audit-ledger--plain'}`}
          role="table"
          aria-label={`Lances do ${lotLabel(audit.number)} com verificação`}
        >
          {rows.length > 0 && <LedgerHead />}
          {rows.map((row) => (
            <LedgerRow key={row.bid.seq} row={row} />
          ))}
          {truncated && <SealRow />}
        </div>
      )}
    </section>
  );
}

function LedgerHead() {
  return (
    <div className="audit-row audit-row--head" role="row">
      <div className="audit-row__seq" role="columnheader">
        Seq.
      </div>
      <div role="columnheader">Licitante</div>
      <div role="columnheader">Valor</div>
      <div role="columnheader">Horário</div>
      <div className="audit-row__code" role="columnheader">
        Código
      </div>
      <div role="columnheader">Verificação</div>
    </div>
  );
}

function rowClass({ bid }: Row): string {
  if (bid.mark === 'tampered') return 'audit-row is-broken is-first';
  return bid.mark === 'unverifiable' ? 'audit-row is-broken' : 'audit-row';
}

function LedgerRow({ row }: { row: Row }) {
  const { bid } = row;
  return (
    <div className={rowClass(row)} role="row">
      <div className="audit-row__seq" role="cell">
        {bid.seq}
      </div>
      <div className="audit-row__alias" role="cell" data-label="Licitante">
        {bid.alias}
      </div>
      <div className="audit-row__amount" role="cell" data-label="Valor">
        {formatMoney(bid.amount)}
      </div>
      <div className="audit-row__time" role="cell" data-label="Horário">
        {formatTime(bid.createdAt)}
      </div>
      <div className="audit-row__code" role="cell" data-label="Código">
        <span className="audit-row__copy">
          <HashCopy hash={bid.hash} />
        </span>
      </div>
      <div className="audit-row__check" role="cell" data-label="Verificação">
        <span className="audit-row__stack">
          <Check ok={bid.mark === 'intact'} label={row.label} />
          {row.note && <span className="audit-row__note">{row.note}</span>}
        </span>
      </div>
    </div>
  );
}

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`audit-check audit-check--${ok ? 'ok' : 'bad'}`}>
      <span className="audit-check__mark" aria-hidden="true">
        {ok ? '✓' : '✕'}
      </span>
      {label}
    </span>
  );
}

// a API não devolve o selo, então a linha diz que não confere sem mostrar os códigos
function SealRow() {
  return (
    <div className="audit-row is-seal" role="row">
      <div className="audit-row__seq audit-row__seq--seal" role="cell">
        Selo
      </div>
      <div className="audit-row__alias" role="cell" data-label="Registro">
        Selo do lote
      </div>
      <div className="audit-row__seal" role="cell" data-label="Esperado">
        O selo do lote não confere com o código do último lance da lista.
      </div>
      <div className="audit-row__check" role="cell" data-label="Verificação">
        <Check ok={false} label="Não confere" />
      </div>
    </div>
  );
}

const steps = [
  'Cada lance recebe um código calculado a partir dos dados dele e do código do lance anterior. Assim, um lance fica preso ao outro.',
  'Quando o lote encerra, o código do último lance vira o selo do lote. Se lances forem apagados do fim, o selo deixa de conferir.',
  'Ao abrir esta página, conferimos todos os códigos de novo. Qualquer lance alterado, apagado ou incluído depois aparece aqui, no ponto exato.',
];

function AuditHow() {
  return (
    <section className="audit-how" aria-labelledby="how-title">
      <h2 id="how-title" className="audit-subtitle">
        Como a verificação funciona
      </h2>
      <ol className="audit-how__steps">
        {steps.map((step, index) => (
          <li key={step} className="audit-how__step">
            <span className="audit-how__number" aria-hidden="true">
              {index + 1}
            </span>
            <span className="audit-how__text">{step}</span>
          </li>
        ))}
      </ol>
      <p className="audit-how__more">
        <a
          className="audit-how__link"
          href={readmeUrl}
          target="_blank"
          rel="noreferrer"
        >
          Saiba mais sobre a verificação
        </a>
      </p>
    </section>
  );
}

function AuditMissing() {
  return (
    <NotFound
      kicker="Auditoria"
      title="Lote não encontrado"
      text="Não existe lote com esse número. Confira o número no card da vitrine ou no comprovante."
      back="Buscar outro lote"
      to="/#auditoria"
    />
  );
}

function AuditSkeleton() {
  return (
    <>
      <p className="sr-only" role="status">
        Conferindo o histórico de lances.
      </p>
      <div className="audit-skel" aria-hidden="true">
        <div className="audit-skel__head">
          <div className="skel audit-skel--kicker" />
          <div className="skel audit-skel--title" />
        </div>
        <div className="skel audit-skel--verdict" />
        <div className="audit-skel__rows">
          <div className="skel audit-skel--thead" />
          <div className="skel audit-skel--row" />
          <div className="skel audit-skel--row" />
          <div className="skel audit-skel--row" />
        </div>
      </div>
    </>
  );
}
