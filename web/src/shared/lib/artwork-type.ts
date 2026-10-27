// tipos dos dois departamentos da D-050; os demais dados da obra ficam em inglês (D-038)
const types: Record<string, string> = {
  Painting: 'Pintura',
  Sculpture: 'Escultura',
  Drawing: 'Desenho',
  Print: 'Gravura',
  'Portrait Miniature': 'Miniatura de retrato',
  Coins: 'Moedas',
  Ceramic: 'Cerâmica',
  Jewelry: 'Joalheria',
  Metalwork: 'Metalurgia',
  Glass: 'Vidro',
  Stone: 'Pedra',
  Ivory: 'Marfim',
  'Arms and Armor': 'Armas e armaduras',
  Silver: 'Prataria',
  Forgery: 'Falsificação',
  'Cosmetic Objects': 'Objetos cosméticos',
  Mosaic: 'Mosaico',
  Plaque: 'Placa',
  Vessels: 'Vasos',
};

export function artworkType(type: string): string {
  return types[type] ?? type;
}
