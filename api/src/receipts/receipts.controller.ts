import { Controller, Get, Param } from '@nestjs/common';
import { ReceiptResponseDto } from './dto/receipt-response.dto';
import { ReceiptTokenPipe } from './receipt-token.pipe';
import { ReceiptsService } from './receipts.service';

@Controller('receipts')
export class ReceiptsController {
  constructor(private readonly receipts: ReceiptsService) {}

  @Get(':token')
  find(
    @Param('token', ReceiptTokenPipe) token: string,
  ): Promise<ReceiptResponseDto> {
    return this.receipts.find(token);
  }
}
