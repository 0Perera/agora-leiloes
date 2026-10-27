import { describe, expect, it } from 'vitest';
import { connectionAfter } from './connection';

describe('connectionAfter', () => {
  it('marca a conexão como perdida quando o stream dá erro', () => {
    expect(connectionAfter('live', 'error')).toBe('lost');
  });

  it('continua perdida quando o stream reabre antes de sincronizar', () => {
    expect(connectionAfter('lost', 'open')).toBe('lost');
  });

  it('volta ao vivo depois que os GETs sincronizam a sala', () => {
    expect(connectionAfter('lost', 'synced')).toBe('live');
  });
});
