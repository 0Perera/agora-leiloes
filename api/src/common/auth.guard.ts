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
    const token = bearerToken(request);
    if (!token) throw new UnauthorizedException();
    try {
      const payload = await this.jwt.verifyAsync<TokenPayload>(token);
      request.user = { id: Number(payload.sub), role: payload.role };
    } catch {
      throw new UnauthorizedException();
    }
    return true;
  }
}

function bearerToken(request: Request): string | undefined {
  const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
  return scheme?.toLowerCase() === 'bearer' ? token : undefined;
}
