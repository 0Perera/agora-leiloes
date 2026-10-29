import { Link, useParams } from 'react-router';
import { lotImageUrl } from '../../shared/api/client';
import type { Receipt } from '../../shared/api/types';
import { formatLongDate } from '../../shared/lib/date';
import { formatMoney } from '../../shared/lib/money';
import { lotLabel } from '../../shared/lib/roman';
import { LoadError } from '../../shared/ui/load-error';
import { Niche } from '../../shared/ui/niche';
import { NotFound } from '../../shared/ui/not-found';
import { LinkCopy } from '../../shared/ui/link-copy';
import { HashCopy } from '../../shared/ui/hash-copy';
import { signText } from './receipt';
import { useReceipt } from './use-receipt';
import './receipt.css';

export function ReceiptPage() {
  const token = useParams().token ?? '';
  return <ReceiptScreen key={token} token={token} />;
}

function ReceiptScreen({ token }: { token: string }) {
  const { state, retry } = useReceipt(token);
  return (
    <>
      <p className="receipt-note">
        Comprovante público: qualquer pessoa com este link pode conferir. Nenhum
        dado pessoal é exibido.
      </p>
      {state.status === 'loading' && <ReceiptSkeleton />}
      {state.status === 'missing' && (
        <NotFound
          kicker="Comprovante"
          title="Comprovante não encontrado"
          text="O link pode estar incompleto ou ter sido digitado errado. Confira com quem compartilhou."
          back="Ir para a vitrine"
        />
      )}
      {state.status === 'error' && (
        <LoadError
          title="Não foi possível abrir o comprovante"
          text="Não conseguimos conferir o comprovante agora. Tente de novo em instantes."
          onRetry={retry}
          centered
        />
      )}
      {state.status === 'ready' && (
        <ReceiptView
          receipt={state.receipt}
          checkedAt={state.checkedAt}
          url={`${window.location.origin}/receipts/${token}`}
        />
      )}
    </>
  );
}

type ViewProps = { receipt: Receipt; checkedAt: Date; url: string };

function ReceiptView({ receipt, checkedAt, url }: ViewProps) {
  return (
    <article className="receipt" aria-labelledby="receipt-title">
      <div className="receipt__frame">
        <div className="ag-meander receipt__band" />
        <div className="receipt__body">
          <header className="receipt__head">
            <p className="receipt__brand">Ágora · Casa de leilões</p>
            <h1 id="receipt-title" className="receipt__title">
              Comprovante de arremate
            </h1>
            <p className="receipt__number">
              <span className="receipt__dash" aria-hidden="true" />
              <span className="receipt__label">{lotLabel(receipt.number)}</span>
              <span className="receipt__dash" aria-hidden="true" />
            </p>
          </header>
          <div className="receipt__cols">
            <Niche>
              <img
                className="arch__image"
                src={lotImageUrl(receipt.lotId, receipt.artworkId)}
                alt={`Imagem de ${receipt.title}`}
              />
            </Niche>
            <ReceiptFacts receipt={receipt} />
          </div>
          <ReceiptSign receipt={receipt} checkedAt={checkedAt} />
          <div className="receipt__actions">
            <LinkCopy
              url={url}
              label="Copiar link"
              done="✓ Link do comprovante copiado"
              className="ag-btn ag-btn--secondary"
            />
            <Link
              className="ag-btn ag-btn--quiet receipt__audit"
              to={`/lots/${receipt.lotId}/audit`}
            >
              Auditar este lote
            </Link>
          </div>
        </div>
        <div className="ag-meander receipt__band receipt__band--bottom" />
      </div>
    </article>
  );
}

function ReceiptFacts({ receipt }: { receipt: Receipt }) {
  return (
    <dl className="receipt-dl">
      <dt>Obra</dt>
      <dd className="receipt-dl__work">{receipt.title}</dd>
      <dt>Artista</dt>
      <dd>{receipt.artist}</dd>
      <dt>Valor do arremate</dt>
      <dd>
        <span className="receipt-dl__amount">
          {formatMoney(receipt.amount)}
        </span>
      </dd>
      <dt>Vencedor</dt>
      <dd>
        {receipt.alias}
        <span className="receipt-dl__hint">Apelido usado neste lote</span>
      </dd>
      <dt>Data do arremate</dt>
      <dd>{formatLongDate(receipt.settledAt)}</dd>
    </dl>
  );
}

function ReceiptSign({ receipt, checkedAt }: Omit<ViewProps, 'url'>) {
  const { valid } = receipt;
  const tone = valid ? 'valid' : 'invalid';
  return (
    <section
      className="receipt-sign"
      aria-labelledby="receipt-sign-title"
      aria-live="polite"
    >
      <div className={`ag-seal ag-seal--${valid ? 'intact' : 'tampered'}`}>
        <div className="ag-seal__core">
          <span className="ag-seal__mark" aria-hidden="true">
            {valid ? '✓' : '✕'}
          </span>
          <span className="ag-seal__word">{valid ? 'Válido' : 'Inválido'}</span>
        </div>
      </div>
      <div className="receipt-sign__body">
        <h2
          id="receipt-sign-title"
          className={`receipt-sign__title receipt-sign__title--${tone}`}
        >
          {valid ? 'Comprovante válido' : 'Comprovante inválido'}
        </h2>
        <p className="receipt-sign__text">
          {signText(valid, checkedAt)}
          {!valid && (
            <>
              {' '}
              Confira a <AuditLink lotId={receipt.lotId} />.
            </>
          )}
        </p>
        {valid && (
          <p className="receipt-sign__text">
            Para conferir o histórico completo de lances, use a{' '}
            <AuditLink lotId={receipt.lotId} />.
          </p>
        )}
        <div className="receipt-sign__code">
          <span className="ag-lot__label receipt-sign__label">
            Código de verificação
          </span>
          <HashCopy hash={receipt.finalHash} />
        </div>
      </div>
    </section>
  );
}

function AuditLink({ lotId }: { lotId: number }) {
  return <Link to={`/lots/${lotId}/audit`}>auditoria pública do lote</Link>;
}

function ReceiptSkeleton() {
  return (
    <>
      <p className="sr-only" role="status">
        Conferindo o comprovante.
      </p>
      <div className="receipt" aria-hidden="true">
        <div className="receipt__frame">
          <div className="receipt__body">
            <div className="receipt-skel__head">
              <div className="skel receipt-skel--brand" />
              <div className="skel receipt-skel--title" />
            </div>
            <div className="receipt__cols">
              <div className="skel receipt-skel--art" />
              <div className="receipt-skel__lines">
                <div className="skel receipt-skel--line" />
                <div className="skel receipt-skel--line receipt-skel--w70" />
                <div className="skel receipt-skel--amount" />
                <div className="skel receipt-skel--line receipt-skel--w60" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
