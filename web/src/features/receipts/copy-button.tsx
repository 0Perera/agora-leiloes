import { useCallback, useEffect, useRef, useState } from 'react';
import { shortHash } from './receipt';

type CopyState = 'idle' | 'copied' | 'manual';

const copiedFor = 2500;

// sem a API (contexto inseguro) ou com a permissão negada, cai na cópia manual
function writeClipboard(text: string): Promise<void> {
  try {
    return navigator.clipboard.writeText(text);
  } catch (caught) {
    return Promise.reject(caught);
  }
}

function useCopy(text: string) {
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

export function HashCopy({ hash }: { hash: string }) {
  const { state, copy } = useCopy(hash);
  return (
    <>
      <span className="receipt-hash">
        <code className="receipt-hash__code" title={hash}>
          {shortHash(hash)}
        </code>
        <button className="receipt-hash__copy" type="button" onClick={copy}>
          {state === 'copied' ? '✓ Copiado' : 'Copiar'}
        </button>
      </span>
      {state === 'manual' && <ManualCopy text={hash} />}
    </>
  );
}

export function LinkCopy({ url }: { url: string }) {
  const { state, copy } = useCopy(url);
  return (
    <>
      <button className="ag-btn ag-btn--secondary" type="button" onClick={copy}>
        Copiar link
      </button>
      {state === 'copied' && (
        <span className="receipt-copied" role="status">
          ✓ Link do comprovante copiado
        </span>
      )}
      {state === 'manual' && <ManualCopy text={url} />}
    </>
  );
}

function ManualCopy({ text }: { text: string }) {
  const field = useRef<HTMLInputElement>(null);

  useEffect(() => {
    field.current?.focus();
    field.current?.select();
  }, []);

  return (
    <label className="receipt-manual">
      <span className="receipt-manual__label">Copie manualmente</span>
      <input
        ref={field}
        className="receipt-manual__field"
        type="text"
        value={text}
        readOnly
        onFocus={(event) => event.currentTarget.select()}
      />
    </label>
  );
}
