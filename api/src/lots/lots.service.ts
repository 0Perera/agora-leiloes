import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, MoreThan, Repository } from 'typeorm';
import type { ArtworkDetail } from '../catalog/artwork.mapper';
import { CatalogService } from '../catalog/catalog.service';
import type { ImageFile } from '../catalog/cleveland.client';
import { Clock } from '../common/clock';
import { CreateLotDto } from './dto/create-lot.dto';
import type { CreatedLot } from './dto/lot-response.dto';
import { LotImage } from './lot-image.entity';
import { Lot } from './lot.entity';
import { assertAvailable, scheduleErrors } from './lot.rules';

type Conditions = Pick<
  Lot,
  'startingBid' | 'increment' | 'startsAt' | 'endsAt'
>;

@Injectable()
export class LotsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly catalog: CatalogService,
    private readonly clock: Clock,
    @InjectRepository(LotImage) private readonly images: Repository<LotImage>,
  ) {}

  async create(auctioneerId: number, dto: CreateLotDto): Promise<CreatedLot> {
    const conditions = toConditions(dto);
    const fields = scheduleErrors(conditions, this.clock.now());
    if (Object.keys(fields).length > 0) throw invalid(fields);

    const artwork = await this.catalog.find(dto.artworkId);
    if (!artwork) throw invalid({ artworkId: 'notFound' });
    // Download fora da transação: nada de rede com transação aberta.
    const image = await this.catalog.image(artwork.imageUrl);

    return this.dataSource.transaction((manager) =>
      this.insert(manager, { auctioneerId, artwork, conditions, image }),
    );
  }

  async image(id: number): Promise<ImageFile> {
    const image = await this.images.findOne({
      select: { contentType: true, bytes: true },
      where: { lotId: id },
    });
    if (!image) throw new NotFoundException();
    return { contentType: image.contentType, bytes: image.bytes };
  }

  private async insert(
    manager: EntityManager,
    draft: {
      auctioneerId: number;
      artwork: ArtworkDetail;
      conditions: Conditions;
      image: ImageFile;
    },
  ): Promise<CreatedLot> {
    const { auctioneerId, artwork, conditions, image } = draft;
    // Serializa criações da mesma peça: sem o lock, duas checagens simultâneas passariam juntas.
    await manager.query('SELECT pg_advisory_xact_lock($1)', [artwork.id]);
    const now = this.clock.now();
    const lots = manager.getRepository(Lot);
    const listed = await lots.find({
      select: { id: true, cancelledAt: true, endsAt: true },
      where: { artworkId: artwork.id, endsAt: MoreThan(now) },
    });
    assertAvailable(listed, now);

    const snapshot = toSnapshot(artwork);
    const result = await lots.insert({
      auctioneerId,
      ...snapshot,
      ...conditions,
    });
    const id = Number(result.identifiers[0].id);
    const generated: unknown = result.generatedMaps[0]?.number;
    if (typeof generated !== 'number') throw new Error('lot number missing');

    await manager.getRepository(LotImage).insert({
      lotId: id,
      contentType: image.contentType,
      bytes: image.bytes,
    });
    return { id, number: generated, ...snapshot, ...conditions };
  }
}

function toConditions(dto: CreateLotDto): Conditions {
  return {
    startingBid: dto.startingBid,
    increment: dto.increment,
    startsAt: new Date(dto.startsAt),
    endsAt: new Date(dto.endsAt),
  };
}

function toSnapshot(artwork: ArtworkDetail) {
  return {
    artworkId: artwork.id,
    accessionNumber: artwork.accessionNumber,
    title: artwork.title,
    artist: artwork.artist,
    date: artwork.date,
    type: artwork.type,
    technique: artwork.technique,
    measurements: artwork.measurements,
    description: artwork.description,
    department: artwork.department,
  };
}

function invalid(fields: Record<string, string>): BadRequestException {
  return new BadRequestException({ code: 'VALIDATION_FAILED', fields });
}
