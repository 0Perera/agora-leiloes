// Códigos estáveis das recusas de negócio. O front traduz o código; a API não devolve texto livre.
export type DomainCode =
  | 'EMAIL_TAKEN'
  | 'INVALID_CREDENTIALS'
  | 'ROLE_NOT_ALLOWED'
  | 'BALANCE_LIMIT_EXCEEDED'
  | 'CATALOG_UNAVAILABLE';

export class DomainException extends Error {
  constructor(readonly code: DomainCode) {
    super(code);
  }
}
