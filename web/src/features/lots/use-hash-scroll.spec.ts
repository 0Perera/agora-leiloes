import { describe, expect, it } from 'vitest';
import { scrollTarget } from './use-hash-scroll';

const ready = { settled: true, done: false, manual: false };

describe('scrollTarget', () => {
  it('rola até a seção da âncora depois que a página carrega', () => {
    expect(scrollTarget('#auditoria', ready)).toBe('auditoria');
  });

  it('não rola se o usuário já rolou a página', () => {
    expect(scrollTarget('#auditoria', { ...ready, manual: true })).toBeNull();
  });

  it('não rola de novo depois da primeira rolagem', () => {
    expect(scrollTarget('#auditoria', { ...ready, done: true })).toBeNull();
  });
});
