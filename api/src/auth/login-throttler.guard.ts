import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';
import { DomainException } from '../common/domain.exception';

// Atrás da Cloudflare, req.ip é o servidor dela, compartilhado por muitos clientes.
// O CF-Connecting-IP é preenchido (e sobrescrito) pela Cloudflare: ver D-068.
@Injectable()
export class LoginThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Request): Promise<string> {
    const forwarded = req.header('cf-connecting-ip')?.trim();
    return Promise.resolve(forwarded || req.ip || 'unknown');
  }

  protected throwThrottlingException(): Promise<void> {
    throw new DomainException('TOO_MANY_ATTEMPTS');
  }
}
