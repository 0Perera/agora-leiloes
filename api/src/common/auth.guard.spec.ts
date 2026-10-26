import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard, AuthRequest } from './auth.guard';

const jwt = new JwtService({ secret: 'test-secret-with-at-least-32-chars!!' });

function makeContext(authorization?: string) {
  const request = { headers: { authorization } } as AuthRequest;
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as ExecutionContext;
  return { context, request };
}

describe('AuthGuard.canActivate', () => {
  const guard = new AuthGuard(jwt);

  it('recusa requisição sem token', async () => {
    const { context } = makeContext();

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('recusa token inválido', async () => {
    const forged = new JwtService({
      secret: 'another-secret-with-32-chars!!!!!',
    });
    const token = await forged.signAsync({ sub: '1', role: 'BIDDER' });
    const { context } = makeContext(`Bearer ${token}`);

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('anexa id e papel à requisição com token válido', async () => {
    const token = await jwt.signAsync({ sub: '7', role: 'AUCTIONEER' });
    const { context, request } = makeContext(`Bearer ${token}`);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual({ id: 7, role: 'AUCTIONEER' });
  });
});
