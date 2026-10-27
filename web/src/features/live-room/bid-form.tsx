import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError, api } from '../../shared/api/client';
import type { BidEvent, LotDetail } from '../../shared/api/types';
import { formatMoney, maskAmount, parseAmount } from '../../shared/lib/money';
import '../../shared/ui/field.css';
import { useWallet } from '../wallet/use-wallet';
import { bidError, emptyAmount } from './bid-errors';
import type { BidNotice } from './bid-errors';
import { minimumOf, shortcuts } from './room-bids';

type Props = {
  lot: LotDetail;
  onPlaced: (bid: BidEvent) => void;
  onMissing: () => void;
};

export function BidForm({ lot, onPlaced, onMissing }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const sending = useRef(false);
  const [value, setValue] = useState('');
  const [notice, setNotice] = useState<BidNotice | null>(null);
  const [accepted, setAccepted] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function change(next: string) {
    setValue(maskAmount(next));
    setNotice(null);
    setAccepted('');
  }

  function fail(next: BidNotice) {
    setNotice(next);
    input.current?.focus();
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (sending.current) return;
    const amount = parseAmount(value);
    if (amount === null || amount < 1) return fail(emptyAmount);
    sending.current = true;
    setSubmitting(true);
    const endsAt = lot.endsAt;
    try {
      const bid = await api.placeBid(lot.id, amount);
      onPlaced(bid);
      setValue('');
      setAccepted(acceptedText(bid, endsAt));
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 404) onMissing();
      else fail(bidError(caught));
    } finally {
      sending.current = false;
      setSubmitting(false);
    }
  }

  const invalid = notice?.tone === 'error';

  return (
    <form className="room-bid" noValidate onSubmit={submit}>
      <label className="ag-field" htmlFor="bid-input">
        <span className="ag-field__label">Seu lance</span>
        <span className={invalid ? 'ag-input is-invalid' : 'ag-input'}>
          <span className="ag-input__prefix" aria-hidden="true">
            R$
          </span>
          <input
            ref={input}
            id="bid-input"
            className="ag-input__control"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={value}
            readOnly={submitting}
            onChange={(event) => change(event.target.value)}
            aria-invalid={invalid}
            aria-describedby="bid-help bid-msg"
          />
        </span>
        <BidHelp lot={lot} />
      </label>
      <div
        className="room-shortcuts"
        role="group"
        aria-labelledby="bid-shortcuts"
      >
        <span id="bid-shortcuts" className="ag-field__hint">
          Preencher com:
        </span>
        {shortcuts(lot).map((cents) => (
          <button
            key={cents}
            className="room-chip"
            type="button"
            disabled={submitting}
            onClick={() => change(String(cents))}
          >
            {formatMoney(cents)}
          </button>
        ))}
      </div>
      <div id="bid-msg">
        <BidMessage notice={notice} accepted={accepted} />
      </div>
      <button
        className="ag-btn ag-btn--primary room-bid__submit"
        type="submit"
        disabled={submitting}
      >
        {submitting ? 'Enviando…' : 'Dar lance'}
      </button>
    </form>
  );
}

function BidHelp({ lot }: { lot: LotDetail }) {
  const wallet = useWallet();
  const minimum = `Mínimo: ${formatMoney(minimumOf(lot))}.`;
  const available =
    wallet.status === 'ready'
      ? ` Você tem ${formatMoney(wallet.wallet.available)} disponíveis.`
      : '';
  return (
    <span id="bid-help" className="ag-field__hint">
      {minimum}
      {available}
    </span>
  );
}

function BidMessage({
  notice,
  accepted,
}: {
  notice: BidNotice | null;
  accepted: string;
}) {
  if (notice) {
    const error = notice.tone === 'error';
    return (
      <p
        className={
          error ? 'room-msg room-msg--error' : 'room-msg room-msg--info'
        }
        role={error ? 'alert' : 'status'}
      >
        <span className="room-msg__mark" aria-hidden="true">
          {error ? '✕' : 'i'}
        </span>
        <span>
          <strong>{notice.title}</strong> {notice.text}
        </span>
      </p>
    );
  }
  if (!accepted) return null;
  return (
    <p className="room-msg room-msg--ok" role="status">
      <span className="room-msg__mark" aria-hidden="true">
        ✓
      </span>
      <span>{accepted}</span>
    </p>
  );
}

function acceptedText(bid: BidEvent, endsAt: string): string {
  const text = `Lance de ${formatMoney(bid.amount)} aceito.`;
  const extended = Date.parse(bid.endsAt) > Date.parse(endsAt);
  return extended ? `${text} O fim do lote foi prorrogado em +2 min.` : text;
}
