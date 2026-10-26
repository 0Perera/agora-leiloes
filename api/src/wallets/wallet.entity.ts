import {
  Check,
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('wallets')
@Check('wallets_balance', `"balance" >= "committed" AND "committed" >= 0`)
export class Wallet {
  @PrimaryGeneratedColumn()
  id!: number;

  // O OneToOne já cria o UNIQUE (user_id): uma carteira por usuário.
  @Column({ name: 'user_id', type: 'integer' })
  userId!: number;

  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'integer', default: 0 })
  balance!: number;

  @Column({ type: 'integer', default: 0 })
  committed!: number;
}
