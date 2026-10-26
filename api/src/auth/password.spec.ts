import { hashPassword, verifyPassword } from './password';

describe('password', () => {
  it('aceita a senha certa', async () => {
    const stored = await hashPassword('correct horse');

    await expect(verifyPassword('correct horse', stored)).resolves.toBe(true);
  });

  it('recusa a senha errada', async () => {
    const stored = await hashPassword('correct horse');

    await expect(verifyPassword('wrong horse', stored)).resolves.toBe(false);
  });

  it('gera hashes diferentes para a mesma senha', async () => {
    const first = await hashPassword('correct horse');
    const second = await hashPassword('correct horse');

    expect(first).not.toBe(second);
  });
});
