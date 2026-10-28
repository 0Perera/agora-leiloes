import { describe, expect, it } from 'vitest';
import { shortHash, signText } from './receipt';

describe('shortHash', () => {
  it('mostra os 8 primeiros e os 8 últimos caracteres do hash', () => {
    const hash =
      '9f3c2a7d1be84f06c5a9e2d7710b3c4e8a51d6f0a2c9b7e4d1f08a3e6c1a71e0';
    expect(shortHash(hash)).toBe('9f3c2a7d…6c1a71e0');
  });
});

describe('signText', () => {
  it('diz que a assinatura confere, com a hora da conferência', () => {
    expect(signText(true, new Date(2026, 9, 27, 9, 5))).toBe(
      'A assinatura deste comprovante confere com o registro do lote. Conferido agora, às\u00a009h05.',
    );
  });

  it('avisa que o comprovante inválido pode ter sido alterado', () => {
    expect(signText(false, new Date(2026, 9, 27, 9, 5))).toBe(
      'Este comprovante não confere com o registro do lote e pode ter sido alterado. Confira a auditoria pública do lote.',
    );
  });
});
