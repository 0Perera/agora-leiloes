import {
  randomBytes,
  scrypt,
  ScryptOptions,
  timingSafeEqual,
} from 'node:crypto';

// Formato: scrypt$N$r$p$<salt>$<hash>, em base64. Os parâmetros vão junto para poderem mudar
// depois sem invalidar as senhas antigas (D-040).
const PARAMS = { N: 16384, r: 8, p: 1 };
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const key = await derive(password, salt, KEY_LENGTH, PARAMS);
  const { N, r, p } = PARAMS;
  return [
    'scrypt',
    N,
    r,
    p,
    salt.toString('base64'),
    key.toString('base64'),
  ].join('$');
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [scheme, N, r, p, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64');
  // Dois buffers vazios seriam iguais: um hash vazio aceitaria qualquer senha.
  if (expected.length === 0) return false;
  const params = { N: Number(N), r: Number(r), p: Number(p) };
  const key = await derive(
    password,
    Buffer.from(salt, 'base64'),
    expected.length,
    params,
  );
  return timingSafeEqual(key, expected);
}

function derive(
  password: string,
  salt: Buffer,
  length: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, length, options, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });
}
