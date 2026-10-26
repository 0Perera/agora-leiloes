import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../users/user.entity';
import { AuthRequest } from './auth.guard';
import { DomainException } from './domain.exception';

export const ROLES_KEY = 'roles';

// Roda depois do AuthGuard, que já anexou o usuário à requisição.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!roles?.length) return true;
    const { user } = context.switchToHttp().getRequest<AuthRequest>();
    if (!user || !roles.includes(user.role)) {
      throw new DomainException('ROLE_NOT_ALLOWED');
    }
    return true;
  }
}
