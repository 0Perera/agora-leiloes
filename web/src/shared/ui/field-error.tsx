import './field.css';

type Props = {
  id: string;
  message?: string;
};

export function FieldError({ id, message }: Props) {
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
