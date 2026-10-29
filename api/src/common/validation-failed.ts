import { BadRequestException } from '@nestjs/common';

export function validationFailed(
  fields: Record<string, string>,
): BadRequestException {
  return new BadRequestException({ code: 'VALIDATION_FAILED', fields });
}
