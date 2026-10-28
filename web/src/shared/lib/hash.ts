const edge = 8;

export function shortHash(hash: string): string {
  if (hash.length <= edge * 2) return hash;
  return `${hash.slice(0, edge)}…${hash.slice(-edge)}`;
}
