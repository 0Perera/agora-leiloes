import type { CatalogDepartment } from '../../shared/api/types';

export const departments: { value: CatalogDepartment; label: string }[] = [
  {
    value: 'European Painting and Sculpture',
    label: 'Pintura e escultura europeia',
  },
  { value: 'Greek and Roman Art', label: 'Arte grega e romana' },
];

// termos conferidos na API da Cleveland: todos trazem obras com imagem no departamento
export const suggestions: Record<CatalogDepartment, string[]> = {
  'European Painting and Sculpture': [
    'portrait',
    'Rembrandt',
    'Madonna',
    'landscape',
    'marble',
  ],
  'Greek and Roman Art': ['portrait', 'amphora', 'vase', 'coin', 'marble'],
};
