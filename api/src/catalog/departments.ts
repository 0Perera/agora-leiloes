// A Cleveland não aceita dois departamentos na mesma chamada (D-050).
export const DEPARTMENTS = [
  'European Painting and Sculpture',
  'Greek and Roman Art',
] as const;

export type Department = (typeof DEPARTMENTS)[number];

export const DEFAULT_DEPARTMENT: Department = 'European Painting and Sculpture';

export function isDepartment(value: string): value is Department {
  return (DEPARTMENTS as readonly string[]).includes(value);
}
