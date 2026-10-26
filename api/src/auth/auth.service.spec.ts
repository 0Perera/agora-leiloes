import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { AuthGuard, AuthRequest } from '../common/auth.guard';
import { DomainException } from '../common/domain.exception';
import {
  NewUser,
  PublicUser,
  UserCredentials,
  UsersService,
} from '../users/users.service';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';

class InMemoryUsers {
  private readonly rows: UserCredentials[] = [];

  create(user: NewUser): Promise<PublicUser> {
    const row = { ...user, id: this.rows.length + 1 };
    this.rows.push(row);
    const { id, name, email, role } = row;
    return Promise.resolve({ id, name, email, role });
  }

  findByEmail(email: string): Promise<UserCredentials | null> {
    return Promise.resolve(
      this.rows.find((row) => row.email === email) ?? null,
    );
  }

  findById(id: number): Promise<PublicUser | null> {
    return Promise.resolve(this.rows.find((row) => row.id === id) ?? null);
  }
}

function makeSignup(override: Partial<SignupDto> = {}): SignupDto {
  return {
    name: 'Ana',
    email: 'ana@x.com',
    password: 'correct horse',
    role: 'BIDDER',
    ...override,
  };
}

const jwt = new JwtService({ secret: 'test-secret-with-at-least-32-chars!!' });

async function makeService(): Promise<AuthService> {
  const moduleRef = await Test.createTestingModule({
    providers: [
      AuthService,
      { provide: UsersService, useValue: new InMemoryUsers() },
      { provide: JwtService, useValue: jwt },
    ],
  }).compile();
  return moduleRef.get(AuthService);
}

describe('AuthService.signup', () => {
  let service: AuthService;

  beforeEach(async () => {
    service = await makeService();
  });

  it('recusa cadastro com o mesmo e-mail em outra caixa', async () => {
    await service.signup(makeSignup({ email: 'ana@x.com' }));

    await expect(
      service.signup(makeSignup({ email: 'ANA@x.com' })),
    ).rejects.toThrow(new DomainException('EMAIL_TAKEN'));
  });

  it('emite token que o AuthGuard aceita com id e papel do usuário', async () => {
    const { token, user } = await service.signup(makeSignup());
    const request = {
      headers: { authorization: `Bearer ${token}` },
    } as AuthRequest;
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as ExecutionContext;

    await new AuthGuard(jwt).canActivate(context);

    expect(request.user).toEqual({ id: user.id, role: 'BIDDER' });
  });
});

describe('AuthService.login', () => {
  let service: AuthService;

  beforeEach(async () => {
    service = await makeService();
  });

  it('entra com o e-mail em minúsculas depois do cadastro com maiúsculas', async () => {
    await service.signup(makeSignup({ email: 'Ana@x.com' }));

    const session = await service.login({
      email: 'ana@x.com',
      password: 'correct horse',
    });

    expect(session.user.email).toBe('ana@x.com');
  });

  it('entra com o e-mail digitado em maiúsculas', async () => {
    await service.signup(makeSignup({ email: 'ana@x.com' }));

    const session = await service.login({
      email: 'ANA@x.com',
      password: 'correct horse',
    });

    expect(session.user.email).toBe('ana@x.com');
  });

  it('recusa login com senha errada', async () => {
    await service.signup(makeSignup());

    await expect(
      service.login({ email: 'ana@x.com', password: 'wrong horse' }),
    ).rejects.toThrow(new DomainException('INVALID_CREDENTIALS'));
  });

  it('recusa login com e-mail inexistente com o mesmo código', async () => {
    await expect(
      service.login({ email: 'nobody@x.com', password: 'correct horse' }),
    ).rejects.toThrow(new DomainException('INVALID_CREDENTIALS'));
  });
});

describe('AuthService.me', () => {
  it('recusa me de usuário inexistente', async () => {
    const service = await makeService();

    await expect(service.me(99)).rejects.toThrow(UnauthorizedException);
  });
});
