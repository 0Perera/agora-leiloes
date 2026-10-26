const grouped = /^\d{1,3}(\.\d{3})+(,\d{1,2})?$/;
const plain = /^\d+(,\d{1,2})?$/;

export function formatMoney(cents: number): string {
  const digits = cents % 100 === 0 ? 0 : 2;
  const reais = (cents / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return `R$ ${reais}`;
}

const maxDigits = 10;

// máscara de maquininha: cada dígito entra pela direita, nos centavos
export function maskAmount(text: string): string {
  const digits = text.replace(/\D/g, '').replace(/^0+/, '').slice(0, maxDigits);
  if (digits === '') return '';
  return (Number(digits) / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function parseAmount(text: string): number | null {
  const value = text.trim();
  if (!grouped.test(value) && !plain.test(value)) return null;
  const [whole, fraction = ''] = value.replace(/\./g, '').split(',');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}
