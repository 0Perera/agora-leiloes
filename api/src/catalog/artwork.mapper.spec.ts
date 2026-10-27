import { toArtwork } from './artwork.mapper';

function makeRaw(override: Record<string, unknown> = {}): unknown {
  return {
    id: 135382,
    title: 'Portrait of a Lady',
    creators: [{ description: 'Rembrandt van Rijn (Dutch, 1606–1669)' }],
    culture: ['Netherlands, 17th century'],
    creation_date: '1632',
    type: 'Painting',
    technique: 'oil on canvas',
    images: { web: { url: 'https://openaccess-cdn.clevelandart.org/x.jpg' } },
    ...override,
  };
}

describe('toArtwork', () => {
  it('usa creators[0].description como artista', () => {
    expect(toArtwork(makeRaw())?.artist).toBe(
      'Rembrandt van Rijn (Dutch, 1606–1669)',
    );
  });

  it('usa culture como artista quando não há creators', () => {
    expect(toArtwork(makeRaw({ creators: [] }))?.artist).toBe(
      'Netherlands, 17th century',
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
