export type Connection = 'live' | 'lost';

export type StreamSignal = 'error' | 'open' | 'synced';

// reaberto, o stream só volta a valer depois que os GETs trazem o estado completo
export function connectionAfter(
  current: Connection,
  signal: StreamSignal,
): Connection {
  if (signal === 'error') return 'lost';
  if (signal === 'synced') return 'live';
  return current;
}
