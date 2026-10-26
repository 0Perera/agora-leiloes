import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../users/user.entity';
import { AuthRequest } from './auth.guard';
import { DomainException } from './domain.exception';
import { RolesGuard, ROLES_KEY } from './roles.guard';

function makeContext(
  required: Role[] | undefined,
  role: Role,
): ExecutionContext {
  const handler = () => undefined;
  if (required) Reflect.defineMetadata(ROLES_KEY, required, handler);
  const request = { user: { id: 1, role } } as AuthRequest;
  return {
    getHandler: () => handler,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard.canActivate', () => {
  const guard = new RolesGuard(new Reflector());

  it('libera o papel exigido', () => {
    expect(guard.canActivate(makeContext(['BIDDER'], 'BIDDER'))).toBe(true);
  });

  it('recusa outro papel com ROLE_NOT_ALLOWED', () => {
    const context = makeContext(['AUCTIONEER'], 'BIDDER');

    expect(() => guard.canActivate(context)).toThrow(
      new DomainException('ROLE_NOT_ALLOWED'),
    );
  });

  it('libera rota sem papel exigido', () => {
    expect(guard.canActivate(makeContext([], 'BIDDER'))).toBe(true);
  });
});
