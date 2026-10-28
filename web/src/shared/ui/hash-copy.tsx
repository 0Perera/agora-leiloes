import { shortHash } from '../lib/hash';
import { ManualCopy, useCopy } from './link-copy';
import './hash-copy.css';

export function HashCopy({ hash }: { hash: string }) {
  const { state, copy } = useCopy(hash);
  return (
    <>
      <span className="hash-copy">
        <code className="hash-copy__code" title={hash}>
          {shortHash(hash)}
        </code>
        <button className="hash-copy__button" type="button" onClick={copy}>
          {state === 'copied' ? '✓ Copiado' : 'Copiar'}
        </button>
      </span>
      {state === 'manual' && <ManualCopy text={hash} />}
    </>
  );
}
