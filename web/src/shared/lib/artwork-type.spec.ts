import { describe, expect, it } from 'vitest';
import { artworkType } from './artwork-type';

describe('artworkType', () => {
  it('traduz o tipo do acervo para português', () => {
    expect(artworkType('Painting')).toBe('Pintura');
  });
});
