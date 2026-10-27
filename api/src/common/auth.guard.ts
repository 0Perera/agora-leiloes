import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { Role } from '../users/user.entity';

export type AuthUser = { id: number; role: Role };
export type AuthRequest = Request & { user?: AuthUser };
export type TokenPayload = { sub: string; role: Role };

// Sem token, token expirado ou adulterado: 401 padrão do Nest, sem código de domínio.
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    request.user = await authenticate(this.jwt, request);
    return true;
  }
}

// Visitante passa sem usuário; quem manda Authorization precisa mandar um token válido.
@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    if (request.headers.authorization === undefined) return true;
    request.user = await authenticate(this.jwt, request);
    return true;
  }
}

async function authenticate(
  jwt: JwtService,
  request: Request,
): Promise<AuthUser> {
  const token = bearerToken(request);
  if (!token) throw new UnauthorizedException();
  try {
    const payload = await jwt.verifyAsync<TokenPayload>(token);
    return { id: Number(payload.sub), role: payload.role };
  } catch {
    throw new UnauthorizedException();
  }
}

function bearerToken(request: Request): string | undefined {
  const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
  return scheme?.toLowerCase() === 'bearer' ? token : undefined;
}
