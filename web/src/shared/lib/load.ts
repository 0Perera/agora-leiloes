export type Load<T> =
  | { status: 'loading'; data: T | null }
  | { status: 'error'; data: T | null }
  | { status: 'ready'; data: T };
