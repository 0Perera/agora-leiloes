import type { LotStatus } from '../api/types';

const badges: Record<LotStatus, { modifier: string; text: string }> = {
  live: { modifier: 'live', text: 'Ao vivo' },
  scheduled: { modifier: 'scheduled', text: 'Agendado' },
  ended: { modifier: 'closed', text: 'Encerrado' },
};

export function StatusBadge({ status }: { status: LotStatus }) {
  const { modifier, text } = badges[status];
  return <span className={`ag-badge ag-badge--${modifier}`}>{text}</span>;
}
