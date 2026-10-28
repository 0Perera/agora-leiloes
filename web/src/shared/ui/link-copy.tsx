import { useCallback, useEffect, useRef, useState } from 'react';
import './link-copy.css';

type CopyState = 'idle' | 'copied' | 'manual';

const copiedFor = 2500;

// sem a API (contexto inseguro) ou com a permissão negada, cai na cópia manual
export function writeClipboard(text: string): Promise<void> {
  try {
    return navigator.clipboard.writeText(text);
  } catch (caught) {
    return Promise.reject(caught);
  }
}

export function useCopy(text: string) {
  const [state, setState] = useState<CopyState>('idle');
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = useCallback(() => {
    clearTimeout(timer.current);
    writeClipboard(text).then(
      () => {
        setState('copied');
        timer.current = setTimeout(() => setState('idle'), copiedFor);
      },
      () => setState('manual'),
    );
  }, [text]);

  return { state, copy };
}

type Props = {
  url: string;
  label: string;
  done: string;
  className: string;
};

export function LinkCopy({ url, label, done, className }: Props) {
  const { state, copy } = useCopy(url);
  return (
    <>
      <button className={className} type="button" onClick={copy}>
        {label}
      </button>
      {state === 'copied' && (
        <span className="copy-done" role="status">
          {done}
        </span>
      )}
      {state === 'manual' && <ManualCopy text={url} />}
    </>
  );
}

export function ManualCopy({ text }: { text: string }) {
  const field = useRef<HTMLInputElement>(null);

  useEffect(() => {
    field.current?.focus();
    field.current?.select();
  }, []);

  return (
    <label className="copy-manual">
      <span className="copy-manual__label">Copie manualmente</span>
      <input
        ref={field}
        className="copy-manual__field"
        type="text"
        value={text}
        readOnly
        onFocus={(event) => event.currentTarget.select()}
      />
    </label>
  );
}
