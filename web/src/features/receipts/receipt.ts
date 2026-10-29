import { formatClock } from '../../shared/lib/date';

export function signText(valid: boolean, checkedAt: Date): string {
  if (!valid)
    return 'Este comprovante não confere com o registro do lote e pode ter sido alterado.';
  // a rota do comprovante confere só a assinatura; a cadeia de lances é a auditoria quem confere
  return `A assinatura deste comprovante confere com o registro do lote. Conferido agora, às\u00a0${formatClock(checkedAt)}.`;
}
