import {
  BadRequestException,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';

// Formato que o front traduz por campo: { code: 'VALIDATION_FAILED', fields: { email: 'isEmail' } }.
export function validationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    transform: true,
    exceptionFactory: (errors) =>
      new BadRequestException({
        code: 'VALIDATION_FAILED',
        fields: toFields(errors),
      }),
  });
}

// Decorators rodam de baixo para cima, então as regras chegam na ordem inversa da escrita.
// A última chave é a regra violada que aparece primeiro no DTO.
function toFields(errors: ValidationError[]): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const error of errors) {
    const rule = Object.keys(error.constraints ?? {}).at(-1);
    if (rule) fields[error.property] = rule;
  }
  return fields;
}
