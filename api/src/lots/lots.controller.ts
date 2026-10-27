import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';
import { Auth } from '../common/auth.decorator';
import type { AuthUser } from '../common/auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { CreateLotDto } from './dto/create-lot.dto';
import { LotResponseDto, toLotResponse } from './dto/lot-response.dto';
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

  // Lote não é editável: a imagem de um id nunca muda, então o cache pode ser eterno.
  @Get(':id/image')
  async image(
    @Param('id') id: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const image = await this.lots.image(Number(id));
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
