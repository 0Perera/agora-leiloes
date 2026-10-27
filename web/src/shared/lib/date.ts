const shortFormat = new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
  hourCycle: 'h23',
});

export function formatShortDate(iso: string): string {
  const parts = shortFormat.formatToParts(new Date(iso));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? '';
  const minute = part('minute') === '00' ? '' : part('minute');
  const month = part('month').replace('.', '');
  return `${part('day')} ${month}, ${Number(part('hour'))}h${minute}`;
}

export function fromLocalInput(value: string): string | null {
  const date = new Date(value);
  return value === '' || Number.isNaN(date.getTime())
    ? null
    : date.toISOString();
}

export function toLocalInput(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return `${day}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
