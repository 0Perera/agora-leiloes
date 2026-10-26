import { BadRequestException } from '@nestjs/common';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { validationPipe } from './validation.pipe';

class SampleDto {
  @IsNotEmpty()
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

async function validate(body: unknown): Promise<unknown> {
  try {
    await validationPipe().transform(body, {
      type: 'body',
      metatype: SampleDto,
    });
  } catch (error) {
    if (error instanceof BadRequestException) return error.getResponse();
    throw error;
  }
  return undefined;
}

describe('validationPipe', () => {
  it('responde VALIDATION_FAILED com a primeira regra violada de cada campo', async () => {
    const response = await validate({ email: '', password: 42 });

    expect(response).toEqual({
      code: 'VALIDATION_FAILED',
      fields: { email: 'isNotEmpty', password: 'isString' },
    });
  });
});
