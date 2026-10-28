import { ManualCopy, useCopy } from '../../shared/ui/link-copy';
import { shortHash } from './receipt';

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
