import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { validate } from './validate.testing';

class SampleDto {
  @IsNotEmpty()
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

describe('validationPipe', () => {
  it('responde VALIDATION_FAILED com a primeira regra violada de cada campo', async () => {
    const response = await validate(SampleDto, { email: '', password: 42 });

    expect(response).toEqual({
      code: 'VALIDATION_FAILED',
      fields: { email: 'isNotEmpty', password: 'isString' },
    });
  });
});
