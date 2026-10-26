import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { DomainException } from '../common/domain.exception';
import { WalletsService } from '../wallets/wallets.service';
import { User } from './user.entity';

const UNIQUE_VIOLATION = '23505';

export type NewUser = Pick<User, 'name' | 'email' | 'passwordHash' | 'role'>;
export type PublicUser = Pick<User, 'id' | 'name' | 'email' | 'role'>;
export type UserCredentials = PublicUser & { passwordHash: string };

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly wallets: WalletsService,
  ) {}

  // O AuthService confere o e-mail antes; o unique do banco pega o cadastro simultâneo.
  async create(user: NewUser): Promise<PublicUser> {
    try {
      const saved = await this.dataSource.transaction(async (manager) => {
        const repository = manager.getRepository(User);
        const created = await repository.save(repository.create(user));
        await this.wallets.open(manager, created.id);
        return created;
      });
      return {
        id: saved.id,
        name: saved.name,
        email: saved.email,
        role: saved.role,
      };
    } catch (error) {
      if (isUniqueViolation(error)) throw new DomainException('EMAIL_TAKEN');
      throw error;
    }
  }

  findByEmail(email: string): Promise<UserCredentials | null> {
    return this.users.findOne({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        passwordHash: true,
      },
      where: { email },
    });
  }

  findById(id: number): Promise<PublicUser | null> {
    return this.users.findOne({
      select: { id: true, name: true, email: true, role: true },
      where: { id },
    });
  }
}

function isUniqueViolation(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) return false;
  const driverError: unknown = error.driverError;
  return (
    typeof driverError === 'object' &&
    driverError !== null &&
    'code' in driverError &&
    driverError.code === UNIQUE_VIOLATION
  );
}
