// Códigos estáveis das recusas de negócio. O front traduz o código; a API não devolve texto livre.
export type DomainCode =
  | 'EMAIL_TAKEN'
  | 'INVALID_CREDENTIALS'
  | 'ROLE_NOT_ALLOWED'
  | 'BALANCE_LIMIT_EXCEEDED'
  | 'CATALOG_UNAVAILABLE'
  | 'IMAGE_DOWNLOAD_FAILED'
  | 'ARTWORK_ALREADY_LISTED'
  | 'LOT_HAS_BIDS'
  | 'LOT_ENDED'
  | 'LOT_NOT_STARTED'
  | 'ALREADY_WINNING'
  | 'BID_BELOW_MINIMUM'
  | 'INSUFFICIENT_BALANCE'
  | 'LOT_INTEGRITY_FAILED'
  | 'TOO_MANY_ATTEMPTS';

export class DomainException extends Error {
  constructor(
    readonly code: DomainCode,
    readonly detail?: Record<string, unknown>,
  ) {
    super(code);
  }
}
