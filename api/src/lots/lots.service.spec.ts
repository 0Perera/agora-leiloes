import { DataSource, Repository } from 'typeorm';
import type { ArtworkDetail } from '../catalog/artwork.mapper';
import { CatalogService } from '../catalog/catalog.service';
import { DomainException } from '../common/domain.exception';
import { CreateLotDto } from './dto/create-lot.dto';
import { LotImage } from './lot-image.entity';
import { LotsService } from './lots.service';

const NOW = new Date('2026-10-26T12:00:00Z');

function makeArtwork(): ArtworkDetail {
  return {
    id: 135382,
    title: 'Portrait of a Lady',
    artist: 'Rembrandt van Rijn',
    date: '1632',
    type: 'Painting',
    technique: 'oil on canvas',
    imageUrl: 'https://openaccess-cdn.clevelandart.org/x.jpg',
    accessionNumber: '1950.1',
    measurements: '100 x 80 cm',
    description: null,
    department: 'European Painting and Sculpture',
  };
}

function makeDto(): CreateLotDto {
  return {
    artworkId: 135382,
    startingBid: 100_000,
    increment: 5_000,
    startsAt: '2026-10-27T12:00:00Z',
    endsAt: '2026-10-28T12:00:00Z',
  };
}

describe('LotsService.create', () => {
  it('não grava lote quando a imagem falha', async () => {
    const catalog = {
      find: () => Promise.resolve(makeArtwork()),
      image: () => Promise.reject(new DomainException('IMAGE_DOWNLOAD_FAILED')),
    };
    const dataSource = { transaction: jest.fn() };
    const service = new LotsService(
      dataSource as unknown as DataSource,
      catalog as unknown as CatalogService,
      { now: () => NOW },
      {} as Repository<LotImage>,
    );

    await expect(service.create(1, makeDto())).rejects.toThrow(
      new DomainException('IMAGE_DOWNLOAD_FAILED'),
    );
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });
});
