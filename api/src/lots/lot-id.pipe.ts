import { Injectable, NotFoundException, PipeTransform } from '@nestjs/common';

const MAX_ID = 2_147_483_647;

// Id fora do integer nunca existe: 404 sem tocar o banco, em vez de erro do Postgres.
@Injectable()
export class LotIdPipe implements PipeTransform<string, number> {
  transform(value: string): number {
    const id = /^\d+$/.test(value) ? Number(value) : NaN;
    if (!Number.isInteger(id) || id < 1 || id > MAX_ID) {
      throw new NotFoundException();
    }
    return id;
  }
}
