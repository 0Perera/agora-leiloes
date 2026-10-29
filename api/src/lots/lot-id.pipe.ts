import { Injectable, NotFoundException, PipeTransform } from '@nestjs/common';
import { MAX_INT } from '../common/max-int';

// Id fora do integer nunca existe: 404 sem tocar o banco, em vez de erro do Postgres.
@Injectable()
export class LotIdPipe implements PipeTransform<string, number> {
  transform(value: string): number {
    const id = /^\d+$/.test(value) ? Number(value) : NaN;
    if (!Number.isInteger(id) || id < 1 || id > MAX_INT) {
      throw new NotFoundException();
    }
    return id;
  }
}
