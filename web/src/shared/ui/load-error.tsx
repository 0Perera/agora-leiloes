import type { ReactNode } from 'react';
import './load-error.css';

type Props = {
  title: string;
  text: string;
  onRetry: () => void;
  centered?: boolean;
  children?: ReactNode;
};

export function LoadError({ title, text, onRetry, centered, children }: Props) {
  const className = centered ? 'load-error load-error--centered' : 'load-error';
  return (
    <div className={className} role="alert">
      <div className="ag-notice ag-notice--error">
        <span className="ag-notice__mark" aria-hidden="true">
          ✕
        </span>
        <p className="ag-notice__title">{title}</p>
        <p className="ag-notice__text">{text}</p>
      </div>
      <div className="load-error__actions">
        <button
          className="ag-btn ag-btn--secondary"
          type="button"
          onClick={onRetry}
        >
          Tentar de novo
        </button>
        {children}
      </div>
    </div>
  );
}
