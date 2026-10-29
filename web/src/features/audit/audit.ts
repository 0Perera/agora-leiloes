import type { AuditBid, BidMark, LotAudit } from '../../shared/api/types';
import { formatClock } from '../../shared/lib/date';

export type Verdict = { intact: boolean; title: string; text: string };

export function verdictOf(audit: LotAudit): Verdict {
  const count = audit.bids.length;
  switch (audit.result) {
    case 'intact':
      return {
        intact: true,
        title: 'Histórico íntegro',
        text: intactText(count),
      };
    case 'tampered':
      return {
        intact: false,
        title: `Histórico adulterado no lance ${audit.brokenSeq}`,
        text: `O lance ${audit.brokenSeq} foi alterado depois de registrado: os dados dele não conferem mais com o código. A partir dele, nenhum lance pode ser confirmado.`,
      };
    case 'truncated':
      return {
        intact: false,
        title: 'Histórico adulterado: lances removidos do fim',
        text: truncatedText(count),
      };
    case 'receipt_tampered':
      return {
        intact: false,
        title: 'Comprovante não confere com o histórico',
        text: 'Os lances estão íntegros, mas o comprovante do lote não confere com o último lance. O comprovante pode ter sido alterado depois da liquidação.',
      };
  }
}

function truncatedText(count: number): string {
  if (count === 0)
    return 'Nenhum lance aparece no histórico, mas o selo do lote indica que houve lances. Isso indica que eles foram apagados.';
  if (count === 1)
    return 'O lance listado não confere com o selo do lote. Isso indica que lances foram apagados do final do histórico.';
  return `Os ${count} lances listados estão em sequência, mas o último não confere com o selo do lote. Isso indica que lances foram apagados do final do histórico.`;
}

function intactText(count: number): string {
  if (count === 0)
    return 'O lote ainda não recebeu lances. Quando receber, cada um entra na sequência e pode ser conferido aqui.';
  if (count === 1)
    return 'O único lance está registrado e confere com o selo do lote. Nada foi alterado, apagado ou incluído depois.';
  return `Os ${count} lances estão em sequência, sem nenhuma quebra, e o último confere com o selo do lote. Nada foi alterado, apagado ou incluído depois.`;
}

export function countText(count: number): string {
  return count === 1 ? '1 lance registrado' : `${count} lances registrados`;
}

export function checkedText(checkedAt: Date): string {
  return `Verificado agora, às\u00a0${formatClock(checkedAt)}.`;
}

export type CheckView = { label: string; busy: boolean; error: string | null };

// durante a nova conferência o veredito anterior fica na tela; o botão é o aviso
export function checkView(checking: boolean, failed: boolean): CheckView {
  if (checking) return { label: 'Verificando…', busy: true, error: null };
  return {
    label: 'Verificar de novo',
    busy: false,
    error: failed
      ? 'Não foi possível verificar de novo agora. O resultado acima é o da última verificação.'
      : null,
  };
}

export type Row = { bid: AuditBid; label: string; note: string | null };

const labels: Record<BidMark, string> = {
  intact: 'Íntegro',
  tampered: 'Adulterado',
  unverifiable: 'Não verificável',
};

export function rowsOf(audit: LotAudit): Row[] {
  const firstUnverifiable = audit.bids.find(
    (bid) => bid.mark === 'unverifiable',
  );
  return audit.bids.map((bid) => ({
    bid,
    label: labels[bid.mark],
    note: noteOf(bid, bid === firstUnverifiable, audit.brokenSeq),
  }));
}

function noteOf(
  bid: AuditBid,
  firstUnverifiable: boolean,
  brokenSeq: number | null,
): string | null {
  if (bid.mark === 'tampered')
    return 'O histórico foi mexido aqui: o código registrado não confere com os dados deste lance.';
  if (firstUnverifiable)
    return `Depende do lance ${brokenSeq} e não pode ser confirmado.`;
  return null;
}
