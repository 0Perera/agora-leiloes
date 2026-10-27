import {
  type ReceiptFields,
  verify as verifyReceipt,
} from '../receipts/receipt.signature';
import { sign } from './sign';

export const GENESIS = '0'.repeat(64);

export type BidLink = {
  lotId: number;
  seq: number;
  userId: number;
  amount: number;
  createdAt: Date;
  prevHash: string | null;
};

export function hashBid(secret: string, bid: BidLink): string {
  return sign(secret, 'bid', [
    bid.lotId,
    bid.seq,
    bid.userId,
    bid.amount,
    bid.createdAt.toISOString(),
    bid.prevHash ?? GENESIS,
  ]);
}

export type LotSeal = {
  lotId: number;
  count: number;
  lastHash: string | null;
};

// Contagem + último hash detecta lance removido do final; o lotId impede
// copiar o selo de outro lote (D-056).
export function sealLot(secret: string, seal: LotSeal): string {
  return sign(secret, 'seal', [
    seal.lotId,
    seal.count,
    seal.lastHash ?? GENESIS,
  ]);
}

// Selo que o lote deveria ter com o último lance lido; lance e liquidação conferem antes de gravar.
export function expectedSeal(
  secret: string,
  lotId: number,
  last: { seq: number; hash: string } | null,
): string {
  return sealLot(secret, {
    lotId,
    count: last?.seq ?? 0,
    lastHash: last?.hash ?? null,
  });
}

export type ChainBid = Omit<BidLink, 'lotId' | 'prevHash'> & {
  prevHash: string;
  hash: string;
};

export type ChainReceipt = Omit<ReceiptFields, 'lotId'> & { signature: string };

export type AuditInput = {
  lotId: number;
  seal: string | null;
  settled: boolean;
  bids: ChainBid[];
  receipt: ChainReceipt | null;
};

export type AuditResult =
  'intact' | 'tampered' | 'truncated' | 'receipt_tampered';

export type BidMark = 'intact' | 'tampered' | 'unverifiable';

export type Verdict = {
  result: AuditResult;
  brokenSeq: number | null;
  marks: BidMark[];
};

// Lances em ordem de seq. Depois do primeiro elo quebrado, nada prova o que vem em seguida.
export function verify(secret: string, audit: AuditInput): Verdict {
  const broken = firstBroken(secret, audit.lotId, audit.bids);
  const marks = audit.bids.map((_, index) => mark(index, broken));
  if (broken !== -1) {
    return { result: 'tampered', brokenSeq: audit.bids[broken].seq, marks };
  }
  return { result: integrity(secret, audit), brokenSeq: null, marks };
}

function firstBroken(secret: string, lotId: number, bids: ChainBid[]): number {
  return bids.findIndex((bid, index) => {
    const prevHash = index === 0 ? GENESIS : bids[index - 1].hash;
    return (
      bid.seq !== index + 1 ||
      bid.prevHash !== prevHash ||
      bid.hash !== hashBid(secret, { ...bid, lotId })
    );
  });
}

function mark(index: number, broken: number): BidMark {
  if (broken === -1 || index < broken) return 'intact';
  return index === broken ? 'tampered' : 'unverifiable';
}

// Selo nulo não é íntegro (D-058): com a cadeia intacta, é a evidência que falta.
function integrity(
  secret: string,
  audit: AuditInput,
): Exclude<AuditResult, 'tampered'> {
  const last = audit.bids.at(-1) ?? null;
  if (audit.seal !== expectedSeal(secret, audit.lotId, last)) {
    return 'truncated';
  }
  if (audit.settled && last && !receiptMatches(secret, audit, last.hash)) {
    return 'receipt_tampered';
  }
  return 'intact';
}

function receiptMatches(
  secret: string,
  { lotId, receipt }: AuditInput,
  finalHash: string,
): boolean {
  if (!receipt || receipt.finalHash !== finalHash) return false;
  const { signature, ...fields } = receipt;
  return verifyReceipt(secret, { ...fields, lotId }, signature);
}
