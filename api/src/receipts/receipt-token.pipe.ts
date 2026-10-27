import { Injectable, NotFoundException, PipeTransform } from '@nestjs/common';

// randomBytes(32) em base64url tem sempre 43 caracteres: fora disso, 404 sem tocar o banco.
const TOKEN = /^[A-Za-z0-9_-]{43}$/;

@Injectable()
export class ReceiptTokenPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!TOKEN.test(value)) throw new NotFoundException();
    return value;
  }
}
