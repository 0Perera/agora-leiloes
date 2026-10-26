import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TokenPayload } from '../common/auth.guard';
import { DomainException } from '../common/domain.exception';
import { PublicUser, UsersService } from '../users/users.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { hashPassword, verifyPassword } from './password';

@Injectable()
export class AuthService {
  // Hash fictício: e-mail inexistente também paga o custo do scrypt, para o tempo
  // de resposta não revelar se o e-mail está cadastrado.
  private readonly dummyHash = hashPassword('dummy-password-for-timing');

  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async signup(dto: SignupDto): Promise<AuthResponseDto> {
    const email = normalizeEmail(dto.email);
    if (await this.users.findByEmail(email)) {
      throw new DomainException('EMAIL_TAKEN');
    }
    const user = await this.users.create({
      name: dto.name,
      email,
      passwordHash: await hashPassword(dto.password),
      role: dto.role,
    });
    return this.session(user);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.users.findByEmail(normalizeEmail(dto.email));
    const stored = user?.passwordHash ?? (await this.dummyHash);
    const valid = await verifyPassword(dto.password, stored);
    if (!user || !valid) throw new DomainException('INVALID_CREDENTIALS');
    const { id, name, email, role } = user;
    return this.session({ id, name, email, role });
  }

  // Usuário removido depois de emitido o token: trata como token inválido.
  async me(id: number): Promise<UserResponseDto> {
    const user = await this.users.findById(id);
    if (!user) throw new UnauthorizedException();
    return user;
  }

  private async session(user: PublicUser): Promise<AuthResponseDto> {
    const payload: TokenPayload = { sub: String(user.id), role: user.role };
    return { token: await this.jwt.signAsync(payload), user };
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
