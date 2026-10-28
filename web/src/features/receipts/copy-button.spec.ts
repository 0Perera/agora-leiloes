import { describe, expect, it } from 'vitest';
import { writeClipboard } from './copy-button';

describe('writeClipboard', () => {
  it('recusa a cópia quando o navegador não oferece a área de transferência', async () => {
    await expect(writeClipboard('abc')).rejects.toBeInstanceOf(Error);
  });
});
