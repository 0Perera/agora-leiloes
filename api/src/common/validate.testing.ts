import { BadRequestException, type Paramtype } from '@nestjs/common';
import { validationPipe } from './validation.pipe';

// Corpo do 400 do validationPipe, ou undefined quando o valor passa.
export async function validate(
  metatype: new () => object,
  value: unknown,
  type: Paramtype = 'body',
): Promise<unknown> {
  try {
    await validationPipe().transform(value, { type, metatype });
  } catch (error) {
    if (error instanceof BadRequestException) return error.getResponse();
    throw error;
  }
  return undefined;
}
