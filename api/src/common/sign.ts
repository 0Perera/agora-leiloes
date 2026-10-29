import { createHmac } from 'node:crypto';

export type SignPrefix = 'bid' | 'seal' | 'alias' | 'receipt';

// Prefixo de domínio: uma assinatura de um contexto nunca vale em outro (D-056).
export function sign(
  secret: string,
  prefix: SignPrefix,
  fields: (string | number)[],
): string {
  return createHmac('sha256', secret)
    .update(`${prefix}:${fields.join('|')}`)
    .digest('hex');
}
