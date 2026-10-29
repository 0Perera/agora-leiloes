import type { LotState } from '../api/types';

const badges: Record<LotState, { modifier: string; text: string }> = {
  live: { modifier: 'live', text: 'Ao vivo' },
  scheduled: { modifier: 'scheduled', text: 'Agendado' },
  ended: { modifier: 'closed', text: 'Encerrado' },
  cancelled: { modifier: 'closed', text: 'Cancelado' },
};

export function StatusBadge({ status }: { status: LotState }) {
  const { modifier, text } = badges[status];
  return <span className={`ag-badge ag-badge--${modifier}`}>{text}</span>;
}
