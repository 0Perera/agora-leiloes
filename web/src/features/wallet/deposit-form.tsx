import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../../shared/api/client';
import type { Wallet } from '../../shared/api/types';
import { formatMoney, maskAmount } from '../../shared/lib/money';
import { FieldError } from '../../shared/ui/field-error';
import { depositError, validateAmount } from './deposit';
import { useWallet } from './use-wallet';

const chips = [50000, 100000, 500000];

function successMessage(amount: number, wallet: Wallet): string {
  return (
    `Depósito de ${formatMoney(amount)} confirmado. ` +
    `Novo saldo total: ${formatMoney(wallet.balance)}. ` +
    `Disponível para lances: ${formatMoney(wallet.available)}.`
  );
}

export function DepositForm() {
  const { update } = useWallet();
  const input = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function change(next: string) {
    setValue(maskAmount(next));
    setError('');
    setSuccess('');
  }

  function fail(message: string) {
    setError(message);
    input.current?.focus();
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const result = validateAmount(value);
    if ('error' in result) return fail(result.error);
    setSubmitting(true);
    try {
      const wallet = await api.deposit(result.amount);
      update(wallet);
      setValue('');
      setSuccess(successMessage(result.amount, wallet));
    } catch (caught) {
      fail(depositError(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      id="deposito"
      className="wallet-corners wallet-deposit"
      aria-labelledby="dep-title"
    >
      <div>
        <h2 id="dep-title" className="wallet-deposit-title">
          Depositar
        </h2>
        <p className="wallet-deposit-lede">O valor entra na hora.</p>
      </div>
      <div className="ag-rule" />
      <form className="wallet-deposit-form" noValidate onSubmit={submit}>
        <label className="ag-field" htmlFor="dep-amount">
          <span className="ag-field__label">Valor do depósito</span>
          <span
            className={
              error
                ? 'ag-input wallet-deposit-input is-invalid'
                : 'ag-input wallet-deposit-input'
            }
          >
            <span className="ag-input__prefix" aria-hidden="true">
              R$
            </span>
            <input
              ref={input}
              id="dep-amount"
              className="ag-input__control"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={value}
              readOnly={submitting}
              onChange={(event) => change(event.target.value)}
              aria-invalid={Boolean(error)}
              aria-describedby="dep-help dep-err"
            />
          </span>
          <span id="dep-help" className="ag-field__hint">
            De R$ 1 a R$ 100.000 por depósito.
          </span>
          <FieldError id="dep-err" message={error} />
        </label>
        <div
          className="wallet-chips"
          role="group"
          aria-label="Valores sugeridos"
        >
          {chips.map((cents) => (
            <button
              key={cents}
              className="wallet-chip"
              type="button"
              disabled={submitting}
              onClick={() => change(String(cents))}
            >
              {formatMoney(cents)}
            </button>
          ))}
        </div>
        <div role="status">
          {success && (
            <p className="wallet-deposit-success">
              <span className="wallet-deposit-mark" aria-hidden="true">
                ✓
              </span>
              <span>{success}</span>
            </p>
          )}
        </div>
        <button
          className="ag-btn ag-btn--primary wallet-deposit-submit"
          type="submit"
          disabled={submitting}
        >
          {submitting ? 'Depositando…' : 'Depositar'}
        </button>
      </form>
      <p className="wallet-deposit-note">
        Arremates são debitados do saldo total quando o lote encerra; lances
        superados nunca saem do saldo.
      </p>
    </section>
  );
}
