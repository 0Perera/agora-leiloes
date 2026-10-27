import { useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../../shared/api/client';
import type { Artwork, CreatedLot } from '../../shared/api/types';
import { formatShortDate, toLocalInput } from '../../shared/lib/date';
import { maskAmount } from '../../shared/lib/money';
import { toRoman } from '../../shared/lib/roman';
import { FieldError } from '../../shared/ui/field-error';
import { createError } from './lot-errors';
import { validateLot } from './lot-validation';
import type { LotErrors, LotField, LotForm as Form } from './lot-validation';

type Props = {
  artwork: Artwork;
  onCreated: () => void;
};

const fieldOrder: LotField[] = [
  'startingBid',
  'increment',
  'startsAt',
  'endsAt',
];

function blankForm(): Form {
  const opens = new Date();
  opens.setDate(opens.getDate() + 1);
  opens.setHours(19, 0, 0, 0);
  const closes = new Date(opens);
  closes.setHours(21);
  return {
    startingBid: '',
    increment: '',
    startsAt: toLocalInput(opens),
    endsAt: toLocalInput(closes),
  };
}

function publishedText(lot: CreatedLot): string {
  return `Lote ${toRoman(lot.number)} publicado. Ele aparece na vitrine como Agendado, abrindo em ${formatShortDate(lot.startsAt)}.`;
}

function focusFirst(errors: LotErrors) {
  const field = fieldOrder.find((item) => errors[item]);
  if (field) document.getElementById(`f-${field}`)?.focus();
}

export function LotForm({ artwork, onCreated }: Props) {
  const [form, setForm] = useState<Form>(blankForm);
  const [errors, setErrors] = useState<LotErrors>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [published, setPublished] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function change(field: LotField, value: string) {
    const masked =
      field === 'startingBid' || field === 'increment'
        ? maskAmount(value)
        : value;
    setForm((current) => ({ ...current, [field]: masked }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setNotice(null);
    setPublished(null);
  }

  function reset() {
    setForm(blankForm());
    setErrors({});
    setNotice(null);
    setPublished(null);
  }

  function fail(next: LotErrors, message: string | null) {
    setErrors(next);
    setNotice(message);
    focusFirst(next);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPublished(null);
    const result = validateLot(form, new Date());
    if ('errors' in result) return fail(result.errors, null);
    setSubmitting(true);
    try {
      const lot = await api.createLot({
        artworkId: artwork.id,
        ...result.conditions,
      });
      reset();
      setPublished(publishedText(lot));
      onCreated();
    } catch (caught) {
      const failure = createError(caught);
      fail(failure.fields, failure.notice);
    } finally {
      setSubmitting(false);
    }
  }

  const invalid = fieldOrder.filter((field) => errors[field]).length;

  return (
    <form
      className="panel-corners panel-sheet"
      noValidate
      onSubmit={submit}
      aria-labelledby="sheet-title"
    >
      <h3 id="sheet-title" className="panel-sheet-title">
        2. Ficha do lote
      </h3>
      <div className="panel-sheet-head">
        <span className="ag-field__label">Título do lote</span>
        <p className="panel-sheet-name">{artwork.title}</p>
        <span className="ag-field__hint panel-lock">
          <LockIcon />
          Só leitura: título e dados da obra vêm do acervo do museu, como foram
          catalogados.
        </span>
      </div>
      <div className="panel-sheet-grid">
        <ArtworkFacts artwork={artwork} />
        <div className="panel-sheet-fields">
          <div className="panel-fields">
            <AmountField
              field="startingBid"
              label="Lance inicial"
              hint="O primeiro lance precisa ser igual ou maior."
              form={form}
              errors={errors}
              onChange={change}
            />
            <AmountField
              field="increment"
              label="Aumento mínimo por lance"
              hint="Cada lance seguinte soma pelo menos este valor."
              form={form}
              errors={errors}
              onChange={change}
            />
            <DateField
              field="startsAt"
              label="Início"
              form={form}
              errors={errors}
              onChange={change}
            />
            <DateField
              field="endsAt"
              label="Fim"
              hint="Lances nos últimos 2 min estendem o fim em +2 min."
              form={form}
              errors={errors}
              onChange={change}
            />
          </div>
          <SheetNotices
            invalid={invalid}
            notice={notice}
            published={published}
          />
          <div className="panel-sheet-actions">
            <button
              className="ag-btn ag-btn--primary"
              type="submit"
              disabled={submitting}
            >
              {submitting ? 'Publicando…' : 'Publicar lote'}
            </button>
            <button
              className="ag-btn ag-btn--quiet"
              type="button"
              disabled={submitting}
              onClick={reset}
            >
              Limpar ficha
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

function ArtworkFacts({ artwork }: { artwork: Artwork }) {
  return (
    <div className="panel-facts">
      <div className="panel-niche">
        <div className="panel-niche-stage">
          <img
            className="panel-niche-image"
            src={artwork.imageUrl}
            alt={`Imagem de ${artwork.title}`}
          />
        </div>
      </div>
      <dl className="panel-facts-list">
        <dt className="ag-lot__label">Artista</dt>
        <dd>{artwork.artist || 'Não informado'}</dd>
        <dt className="ag-lot__label">Data</dt>
        <dd>{artwork.date || 'Sem data'}</dd>
        <dt className="ag-lot__label">Técnica</dt>
        <dd>{artwork.technique || 'Não informada'}</dd>
        <dt className="ag-lot__label">Tipo</dt>
        <dd>{artwork.type || 'Não informado'}</dd>
      </dl>
    </div>
  );
}

type FieldProps = {
  field: LotField;
  label: string;
  hint?: string;
  form: Form;
  errors: LotErrors;
  onChange: (field: LotField, value: string) => void;
};

function AmountField(props: FieldProps) {
  return <InputField {...props} type="text" prefix="R$" inputMode="numeric" />;
}

function DateField(props: FieldProps) {
  return <InputField {...props} type="datetime-local" />;
}

type InputProps = FieldProps & {
  type: string;
  prefix?: string;
  inputMode?: 'numeric';
};

function InputField(props: InputProps) {
  const { field, label, hint, form, errors } = props;
  const id = `f-${field}`;
  const error = errors[field];
  const describedBy = hint ? `${id}-help ${id}-err` : `${id}-err`;
  const control = props.prefix
    ? 'ag-input__control'
    : 'ag-input__control panel-text panel-date';

  return (
    <label className="ag-field" htmlFor={id}>
      <span className="ag-field__label">{label}</span>
      <span className={error ? 'ag-input is-invalid' : 'ag-input'}>
        {props.prefix && (
          <span className="ag-input__prefix" aria-hidden="true">
            {props.prefix}
          </span>
        )}
        <input
          id={id}
          className={control}
          type={props.type}
          inputMode={props.inputMode}
          autoComplete="off"
          value={form[field]}
          onChange={(event) => props.onChange(field, event.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
        />
      </span>
      {hint && (
        <span id={`${id}-help`} className="ag-field__hint">
          {hint}
        </span>
      )}
      <FieldError id={`${id}-err`} message={error} />
    </label>
  );
}

type NoticesProps = {
  invalid: number;
  notice: string | null;
  published: string | null;
};

function SheetNotices({ invalid, notice, published }: NoticesProps) {
  const summary =
    invalid === 1
      ? 'Corrija 1 campo para publicar o lote.'
      : `Corrija ${invalid} campos para publicar o lote.`;

  return (
    <>
      {notice && (
        <p className="field-error panel-alert" role="alert">
          <span aria-hidden="true">✕</span>
          <span>
            <strong>O lote não foi criado.</strong> {notice}
          </span>
        </p>
      )}
      {invalid > 0 && (
        <p className="field-error panel-alert" role="alert">
          <span aria-hidden="true">✕</span>
          <span>{summary}</span>
        </p>
      )}
      <div role="status">
        {published && (
          <p className="panel-success">
            <span aria-hidden="true">✓</span>
            <span>{published}</span>
          </p>
        )}
      </div>
    </>
  );
}

function LockIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#5e5449"
      strokeWidth="2"
      strokeLinecap="square"
      aria-hidden="true"
    >
      <rect x="5" y="11" width="14" height="10" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}
