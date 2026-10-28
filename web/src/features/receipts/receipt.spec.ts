import { describe, expect, it } from 'vitest';
import { signText } from './receipt';

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
