const numerals: [number, string][] = [
  [1000, 'M'],
  [900, 'CM'],
  [500, 'D'],
  [400, 'CD'],
  [100, 'C'],
  [90, 'XC'],
  [50, 'L'],
  [40, 'XL'],
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
];

// o romano padrão vai só até 3999 (D-054)
const maxRoman = 3999;

export function toRoman(value: number): string | null {
  if (!Number.isInteger(value) || value < 1 || value > maxRoman) return null;
  let rest = value;
  let result = '';
  for (const [amount, symbol] of numerals) {
    while (rest >= amount) {
      result += symbol;
      rest -= amount;
    }
  }
  return result;
}

export function lotLabel(number: number): string {
  const roman = toRoman(number);
  return roman ? `Lote ${roman} · nº ${number}` : `Lote nº ${number}`;
}
