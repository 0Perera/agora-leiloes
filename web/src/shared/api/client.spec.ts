import { describe, expect, it } from 'vitest';
import { lotImageUrl } from './client';

describe('lotImageUrl', () => {
  it('versiona a imagem do lote pela obra', () => {
    expect(lotImageUrl(3, 135382)).toMatch(/\/lots\/3\/image\?v=135382$/);
  });
});
