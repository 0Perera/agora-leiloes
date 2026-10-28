const edge = 8;

export function shortHash(hash: string): string {
  if (hash.length <= edge * 2) return hash;
  return `${hash.slice(0, edge)}…${hash.slice(-edge)}`;
}

export function signText(valid: boolean, checkedAt: Date): string {
  if (!valid)
    return 'Este comprovante não confere com o registro do lote e pode ter sido alterado. Confira a auditoria pública do lote.';
  const pad = (value: number) => String(value).padStart(2, '0');
  const clock = `${pad(checkedAt.getHours())}h${pad(checkedAt.getMinutes())}`;
  return `Este comprovante confere com o registro do lote e com o histórico de lances. Conferido agora, às ${clock}.`;
}
