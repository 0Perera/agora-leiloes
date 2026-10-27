import { toArtwork } from './artwork.mapper';

function makeRaw(override: Record<string, unknown> = {}): unknown {
  return {
    id: 135382,
    title: 'Water Lilies',
    creators: [{ description: 'Claude Monet (French, 1840–1926)' }],
    culture: ['France, 19th century'],
    creation_date: 'c. 1915–1926',
    type: 'Painting',
    technique: 'oil on canvas',
    images: { web: { url: 'https://openaccess-cdn.clevelandart.org/x.jpg' } },
    ...override,
  };
}

describe('toArtwork', () => {
  it('usa creators[0].description como artista', () => {
    expect(toArtwork(makeRaw())?.artist).toBe(
      'Claude Monet (French, 1840–1926)',
    );
  });

  it('usa culture como artista quando não há creators', () => {
    expect(toArtwork(makeRaw({ creators: [] }))?.artist).toBe(
      'France, 19th century',
    );
  });

  it('deixa o artista vazio sem creators nem culture', () => {
    expect(
      toArtwork(makeRaw({ creators: [], culture: undefined }))?.artist,
    ).toBe('');
  });

  it('descarta peça sem imagem', () => {
    expect(toArtwork(makeRaw({ images: null }))).toBeNull();
  });

  it('usa o primeiro item de culture', () => {
    expect(
      toArtwork(
        makeRaw({ creators: [], culture: ['France, 17th century', 'Paris'] }),
      )?.artist,
    ).toBe('France, 17th century');
  });

  it('trata culture vazio como ausente', () => {
    expect(toArtwork(makeRaw({ creators: [], culture: [] }))?.artist).toBe('');
  });
});
