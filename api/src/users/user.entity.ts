import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export const ROLES = ['AUCTIONEER', 'BIDDER'] as const;
export type Role = (typeof ROLES)[number];

// O e-mail chega normalizado do AuthService; o CHECK garante que nada grava maiúsculas por fora.
@Entity('users')
@Check('users_email_lowercase', `"email" = lower("email")`)
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 254, unique: true })
  email!: string;

  @Column({ name: 'password_hash', type: 'varchar' })
  passwordHash!: string;

  @Column({ type: 'enum', enum: ROLES, enumName: 'user_role' })
  role!: Role;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
