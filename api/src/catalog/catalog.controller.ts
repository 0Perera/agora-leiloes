import { Controller, Get, Query } from '@nestjs/common';
import { Auth } from '../common/auth.decorator';
import { CatalogService } from './catalog.service';
import { SearchQueryDto } from './dto/search-query.dto';
import { SearchResponseDto, toSearchResponse } from './dto/search-response.dto';

@Controller('catalog')
@Auth('AUCTIONEER')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('search')
  async search(@Query() query: SearchQueryDto): Promise<SearchResponseDto> {
    return toSearchResponse(await this.catalog.search(query));
  }
}
