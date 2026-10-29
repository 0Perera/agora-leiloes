type Part = (type: Intl.DateTimeFormatPartTypes) => string;

export const pad = (value: number) => String(value).padStart(2, '0');

function partsOf(format: Intl.DateTimeFormat, iso: string): Part {
  const parts = format.formatToParts(new Date(iso));
  return (type) => parts.find((item) => item.type === type)?.value ?? '';
}

const shortFormat = new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
  hourCycle: 'h23',
});

export function formatShortDate(iso: string): string {
  const part = partsOf(shortFormat, iso);
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
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return `${day}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatClock(date: Date): string {
  return `${pad(date.getHours())}h${pad(date.getMinutes())}`;
}

const dayFormat = new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric',
  month: 'short',
});

export function formatDay(iso: string): string {
  const part = partsOf(dayFormat, iso);
  return `${part('day')} ${part('month').replace('.', '')}`;
}

const longFormat = new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hourCycle: 'h23',
});

export function formatLongDate(iso: string): string {
  const part = partsOf(longFormat, iso);
  const when = `${part('day')} de ${part('month')} de ${part('year')}`;
  return `${when}, ${Number(part('hour'))}h${part('minute')}`;
}

const stampFormat = new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

export function formatStamp(iso: string): string {
  const part = partsOf(stampFormat, iso);
  const month = part('month').replace('.', '');
  return `${part('day')} ${month}, ${part('hour')}:${part('minute')}:${part('second')}`;
}

const timeFormat = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

export function formatTime(iso: string): string {
  return timeFormat.format(new Date(iso));
}
