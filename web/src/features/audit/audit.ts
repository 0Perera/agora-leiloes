import type { AuditBid, BidMark, LotAudit } from '../../shared/api/types';
import { fromRoman, toRoman } from '../../shared/lib/roman';

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
        text: `Os ${count} lances listados estão em sequência, mas o último não confere com o selo do lote. Isso indica que lances foram apagados do final do histórico.`,
      };
    case 'receipt_tampered':
      return {
        intact: false,
        title: 'Comprovante não confere com o histórico',
        text: 'Os lances estão íntegros, mas o comprovante do lote não confere com o último lance. O comprovante pode ter sido alterado depois da liquidação.',
      };
  }
}

function intactText(count: number): string {
  if (count === 0)
    return 'O lote ainda não recebeu lances. Quando receber, cada um entra na sequência e pode ser conferido aqui.';
  return `Os ${count} lances estão em sequência, sem nenhuma quebra, e o último confere com o selo do lote. Nada foi alterado, apagado ou incluído depois.`;
}

export function countText(count: number): string {
  return count === 1 ? '1 lance registrado' : `${count} lances registrados`;
}

export function checkedText(checkedAt: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  const clock = `${pad(checkedAt.getHours())}h${pad(checkedAt.getMinutes())}`;
  return `Verificado agora, às\u00a0${clock}.`;
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

const maxNumber = 2_147_483_647;
const prefix = /^lote\s+/i;
const digits = /^\d+$/;

export type Lookup = { number: number } | { error: string };

export function parseLookup(text: string): Lookup {
  const term = text.trim().replace(prefix, '');
  if (term === '') return { error: 'Informe o número do lote para auditar.' };
  const number = digits.test(term)
    ? Number(term)
    : fromRoman(term.toUpperCase());
  if (number === null || number < 1 || number > maxNumber)
    return { error: 'Use o número do lote, como 7 ou VII.' };
  return { number };
}

export function missingText(number: number): string {
  const name = toRoman(number) ?? `nº ${number}`;
  return `Lote ${name} não encontrado. Confira o número no card ou no comprovante.`;
}

export const lookupFailed =
  'Não foi possível buscar o lote agora. Tente de novo.';
