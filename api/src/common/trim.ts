import { TransformFnParams } from 'class-transformer';

// Roda antes da validação: só espaços vira vazio, e ' ana@x.com ' passa no @IsEmail.
export function trim({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}
