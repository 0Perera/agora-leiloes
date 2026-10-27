import { Body, Controller, Get, Post } from '@nestjs/common';
import { Auth } from '../common/auth.decorator';
import type { AuthUser } from '../common/auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { DepositDto } from './dto/deposit.dto';
import {
  toWalletDetail,
  toWalletResponse,
  WalletDetailDto,
  WalletResponseDto,
} from './dto/wallet-response.dto';
import { WalletsService } from './wallets.service';

@Controller('wallet')
@Auth('BIDDER')
export class WalletsController {
  constructor(private readonly wallets: WalletsService) {}

  @Get()
  async find(@CurrentUser() user: AuthUser): Promise<WalletDetailDto> {
    const [wallet, committed] = await Promise.all([
      this.wallets.find(user.id),
      this.wallets.committedLots(user.id),
    ]);
    return toWalletDetail(wallet, committed);
  }

  @Post('deposits')
  async deposit(
    @CurrentUser() user: AuthUser,
    @Body() dto: DepositDto,
  ): Promise<WalletResponseDto> {
    return toWalletResponse(await this.wallets.deposit(user.id, dto.amount));
  }
}
