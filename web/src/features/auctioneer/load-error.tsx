type Props = {
  title: string;
  text: string;
  onRetry: () => void;
};

export function LoadError({ title, text, onRetry }: Props) {
  return (
    <div className="panel-error" role="alert">
      <div className="ag-notice ag-notice--error">
        <span className="ag-notice__mark" aria-hidden="true">
          ✕
        </span>
        <p className="ag-notice__title">{title}</p>
        <p className="ag-notice__text">{text}</p>
      </div>
      <button
        className="ag-btn ag-btn--secondary"
        type="button"
        onClick={onRetry}
      >
        Tentar de novo
      </button>
    </div>
  );
}
