import { describe, expect, it } from 'vitest';
import { restoresFocus } from './menu-close';

describe('restoresFocus', () => {
  it('clique fora fecha o menu sem tirar o foco do elemento clicado', () => {
    expect(restoresFocus('outside')).toBe(false);
  });

  it('Esc devolve o foco ao monograma', () => {
    expect(restoresFocus('escape')).toBe(true);
  });
});
