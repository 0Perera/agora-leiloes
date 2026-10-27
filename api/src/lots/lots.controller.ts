import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';
import { Auth } from '../common/auth.decorator';
import type { AuthUser } from '../common/auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { CreateLotDto } from './dto/create-lot.dto';
import { ListLotsQueryDto } from './dto/list-lots-query.dto';
import { LotCardDto } from './dto/lot-card.dto';
import { LotDetailDto } from './dto/lot-detail.dto';
import { LotResponseDto, toLotResponse } from './dto/lot-response.dto';
import { LotShowcaseDto } from './dto/lot-showcase.dto';
import { LotIdPipe } from './lot-id.pipe';
import { LotsService } from './lots.service';

@Controller('lots')
export class LotsController {
  constructor(private readonly lots: LotsService) {}

  @Post()
  @Auth('AUCTIONEER')
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateLotDto,
  ): Promise<LotResponseDto> {
    return toLotResponse(await this.lots.create(user.id, dto));
  }

  @Get()
  list(@Query() query: ListLotsQueryDto): Promise<LotShowcaseDto> {
    return this.lots.list(query);
  }

  // Declarada antes de ':id', senão 'featured' cairia no handler do detalhe.
  @Get('featured')
  async featured(
    @Res({ passthrough: true }) response: Response,
  ): Promise<LotCardDto | undefined> {
    const lot = await this.lots.featured();
    if (lot) return lot;
    response.status(204);
    return undefined;
  }

  @Get(':id')
  find(@Param('id', LotIdPipe) id: number): Promise<LotDetailDto> {
    return this.lots.find(id);
  }

  @Post(':id/cancel')
  @Auth('AUCTIONEER')
  @HttpCode(HttpStatus.NO_CONTENT)
  cancel(
    @CurrentUser() user: AuthUser,
    @Param('id', LotIdPipe) id: number,
  ): Promise<void> {
    return this.lots.cancel(user.id, id);
  }

  // Lote não é editável: a imagem de um id nunca muda, então o cache pode ser eterno.
  @Get(':id/image')
  async image(
    @Param('id', LotIdPipe) id: number,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const image = await this.lots.image(id);
    response.set({
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    });
    return new StreamableFile(image.bytes, {
      type: image.contentType,
      length: image.bytes.length,
    });
  }
}
