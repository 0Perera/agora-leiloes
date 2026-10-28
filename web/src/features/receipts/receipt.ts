export function signText(valid: boolean, checkedAt: Date): string {
  if (!valid)
    return 'Este comprovante não confere com o registro do lote e pode ter sido alterado. Confira a auditoria pública do lote.';
  const pad = (value: number) => String(value).padStart(2, '0');
  const clock = `${pad(checkedAt.getHours())}h${pad(checkedAt.getMinutes())}`;
  // a rota do comprovante confere só a assinatura; a cadeia de lances é a auditoria quem confere
  return `A assinatura deste comprovante confere com o registro do lote. Conferido agora, às ${clock}.`;
}
