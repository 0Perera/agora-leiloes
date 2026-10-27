import { sign } from './chain';

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

// 6 caracteres de base32 usam os 30 primeiros bits do HMAC (D-044).
function base32(hex: string): string {
  let bits = parseInt(hex.slice(0, 8), 16) >>> 2;
  let out = '';
  for (let i = 0; i < 6; i++) {
    out = BASE32[bits & 31] + out;
    bits >>>= 5;
  }
  return out;
}

export function forLot(secret: string, userId: number, lotId: number): string {
  return `Licitante ${base32(sign(secret, 'alias', [userId, lotId]))}`;
}
