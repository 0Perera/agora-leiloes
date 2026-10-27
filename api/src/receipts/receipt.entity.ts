import {
  Check,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Lot } from '../lots/lot.entity';
import { User } from '../users/user.entity';

// UNIQUE (lot_id): timer e acesso disparando juntos nunca liquidam o lote duas vezes (D-009).
@Entity('receipts')
@Unique('receipts_lot_id', ['lotId'])
@Unique('receipts_token', ['token'])
@Check('receipts_amount', `"amount" > 0`)
export class Receipt {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'lot_id', type: 'integer' })
  lotId!: number;

  @ManyToOne(() => Lot)
  @JoinColumn({ name: 'lot_id' })
  lot!: Lot;

  // Reconhece o vencedor no GET do lote; fica fora da resposta e da assinatura.
  @Column({ name: 'winner_user_id', type: 'integer' })
  winnerUserId!: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'winner_user_id' })
  winner!: User;

  @Column({ type: 'varchar', length: 43 })
  token!: string;

  @Column({ type: 'varchar' })
  alias!: string;

  @Column({ type: 'integer' })
  amount!: number;

  @Column({ name: 'final_hash', type: 'varchar', length: 64 })
  finalHash!: string;

  // Vem do Clock e entra na assinatura, como o created_at do lance (D-056).
  @Column({ name: 'settled_at', type: 'timestamptz' })
  settledAt!: Date;

  @Column({ type: 'varchar', length: 64 })
  signature!: string;
}
