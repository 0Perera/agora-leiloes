import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { ApiError, api } from '../../shared/api/client';
import { FieldError } from '../../shared/ui/field-error';
import { lookupFailed, missingText, parseLookup } from '../audit/audit';

function lookupError(caught: unknown, number: number): string {
  const missing = caught instanceof ApiError && caught.status === 404;
  return missing ? missingText(number) : lookupFailed;
}

export function AuditLookup() {
  const navigate = useNavigate();
  const input = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [searching, setSearching] = useState(false);

  function fail(message: string) {
    setError(message);
    input.current?.focus();
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const lookup = parseLookup(value);
    if ('error' in lookup) return fail(lookup.error);
    setSearching(true);
    try {
      const { id } = await api.lotByNumber(lookup.number);
      navigate(`/lots/${id}/audit`);
    } catch (caught) {
      setSearching(false);
      fail(lookupError(caught, lookup.number));
    }
  }

  return (
    <section
      id="auditoria"
      className="home-audit"
      aria-labelledby="audit-title"
    >
      <div className="home-audit__frame">
        <div
          className="ag-seal ag-seal--intact home-audit__seal"
          aria-hidden="true"
        >
          <div className="ag-seal__core">
            <span className="ag-seal__mark">✓</span>
            <span className="ag-seal__word">Lances</span>
            <span className="ag-seal__word">selados</span>
          </div>
        </div>
        <div className="home-audit__text">
          <h2 id="audit-title" className="home-audit__title">
            Leilões que qualquer pessoa pode conferir
          </h2>
          <p className="home-audit__lede">
            Cada lance recebe um selo ligado ao lance anterior. Se alguém
            alterar, apagar ou incluir um lance depois, a auditoria mostra
            exatamente onde o histórico foi mexido. Os participantes aparecem só
            por apelido.
          </p>
        </div>
        <form className="home-audit__form" noValidate onSubmit={submit}>
          <label className="ag-field" htmlFor="audit-lot">
            <span className="ag-field__label">Número do lote</span>
            <span className={error ? 'ag-input is-invalid' : 'ag-input'}>
              <span className="ag-input__prefix" aria-hidden="true">
                Nº
              </span>
              <input
                ref={input}
                id="audit-lot"
                className="ag-input__control"
                type="text"
                autoComplete="off"
                value={value}
                onChange={(event) => {
                  setValue(event.target.value);
                  setError('');
                }}
                aria-invalid={Boolean(error)}
                aria-describedby="audit-help audit-msg"
              />
            </span>
            <span id="audit-help" className="ag-field__hint">
              Número do lote, ex.: 7 ou VII
            </span>
          </label>
          <FieldError id="audit-msg" message={error} />
          <button
            className="ag-btn ag-btn--secondary home-audit__submit"
            type="submit"
            disabled={searching}
          >
            {searching ? 'Buscando…' : 'Auditar lote'}
          </button>
        </form>
      </div>
    </section>
  );
}
