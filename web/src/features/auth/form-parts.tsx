import type { ReactNode } from 'react';
import type { Notice } from './auth-errors';

type FieldErrorProps = {
  id: string;
  message?: string;
};

export function FieldError({ id, message }: FieldErrorProps) {
  return (
    <span id={id}>
      {message && (
        <span className="field-error">
          <span aria-hidden="true">✕</span>
          <span>{message}</span>
        </span>
      )}
    </span>
  );
}

type TextFieldProps = {
  id: string;
  label: string;
  type: string;
  autoComplete: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  trailing?: ReactNode;
};

export function TextField(props: TextFieldProps) {
  const { id, label, error, hint } = props;
  const errorId = `${id}-err`;
  const hintId = `${id}-help`;
  const describedBy = hint ? `${hintId} ${errorId}` : errorId;

  return (
    <label className="ag-field" htmlFor={id}>
      <span className="ag-field__label">{label}</span>
      <span className={error ? 'ag-input is-invalid' : 'ag-input'}>
        <input
          id={id}
          className="ag-input__control auth-control"
          type={props.type}
          autoComplete={props.autoComplete}
          value={props.value}
          onChange={(event) => props.onChange(event.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
        />
        {props.trailing}
      </span>
      {hint && (
        <span id={hintId} className="ag-field__hint">
          {hint}
        </span>
      )}
      <FieldError id={errorId} message={error} />
    </label>
  );
}

type FormNoticeProps = {
  notice: Partial<Notice> & { text: string };
  tone: 'error' | 'info';
};

export function FormNotice({ notice, tone }: FormNoticeProps) {
  return (
    <div
      className={`ag-notice ag-notice--${tone}`}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      <span className="ag-notice__mark" aria-hidden="true">
        {tone === 'error' ? '✕' : 'i'}
      </span>
      {notice.title && <p className="ag-notice__title">{notice.title}</p>}
      <p className="ag-notice__text">{notice.text}</p>
    </div>
  );
}
