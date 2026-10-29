import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Lot } from '../lots/lot.entity';
import { User } from '../users/user.entity';

// Append-only: nenhum UPDATE ou DELETE. O UNIQUE também serve às buscas por lote (D-057).
@Entity('bids')
@Unique('bids_lot_seq', ['lotId', 'seq'])
@Check('bids_values', `"seq" >= 1 AND "amount" > 0`)
export class Bid {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'lot_id', type: 'integer' })
  lotId!: number;

  @ManyToOne(() => Lot)
  @JoinColumn({ name: 'lot_id' })
  lot!: Lot;

  @Column({ type: 'integer' })
  seq!: number;

  // Lotes comprometidos da carteira e meus lances filtram por licitante.
  @Index('bids_user_id')
  @Column({ name: 'user_id', type: 'integer' })
  userId!: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'integer' })
  amount!: number;

  // Vem do Clock e entra no hash: o now() do banco divergiria do valor assinado (D-056).
  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'prev_hash', type: 'varchar', length: 64 })
  prevHash!: string;

  @Column({ type: 'varchar', length: 64 })
  hash!: string;
}
