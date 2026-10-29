import { ValidationError, ValidationPipe } from '@nestjs/common';
import { validationFailed } from './validation-failed';

export function validationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    transform: true,
    exceptionFactory: (errors) => validationFailed(toFields(errors)),
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
