import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { Role } from '../users/user.entity';
import { AuthGuard } from './auth.guard';
import { RolesGuard, ROLES_KEY } from './roles.guard';

// @Auth() exige token válido; @Auth('BIDDER') exige também o papel.
export function Auth(...roles: Role[]) {
  return applyDecorators(
    SetMetadata(ROLES_KEY, roles),
    UseGuards(AuthGuard, RolesGuard),
  );
}
