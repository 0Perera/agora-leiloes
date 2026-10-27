import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Generated,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

// Status (agendado, ao vivo, encerrado) é calculado por starts_at/ends_at; só eventos viram coluna.
@Entity('lots')
@Check('lots_period', `"ends_at" > "starts_at"`)
@Check(
  'lots_amounts',
  `"starting_bid" > 0 AND "increment" > 0 AND ("current_bid" IS NULL OR "current_bid" > 0)`,
)
@Check('lots_bid_count', `"bid_count" >= 0`)
export class Lot {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'integer', unique: true })
  @Generated('increment')
  number!: number;

  @Index('lots_auctioneer_id')
  @Column({ name: 'auctioneer_id', type: 'integer' })
  auctioneerId!: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'auctioneer_id' })
  auctioneer!: User;

  @Index('lots_artwork_id')
  @Column({ name: 'artwork_id', type: 'integer' })
  artworkId!: number;

  @Column({ name: 'accession_number', type: 'varchar' })
  accessionNumber!: string;

  @Column({ type: 'varchar' })
  title!: string;

  @Column({ type: 'varchar' })
  artist!: string;

  @Column({ type: 'varchar' })
  date!: string;

  @Column({ type: 'varchar' })
  type!: string;

  @Column({ type: 'varchar' })
  technique!: string;

  @Column({ type: 'varchar' })
  measurements!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar' })
  department!: string;

  @Column({ name: 'starting_bid', type: 'integer' })
  startingBid!: number;

  @Column({ type: 'integer' })
  increment!: number;

  @Index('lots_starts_at')
  @Column({ name: 'starts_at', type: 'timestamptz' })
  startsAt!: Date;

  @Index('lots_ends_at')
  @Column({ name: 'ends_at', type: 'timestamptz' })
  endsAt!: Date;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt!: Date | null;

  @Column({ name: 'settled_at', type: 'timestamptz', nullable: true })
  settledAt!: Date | null;

  // Cópia para exibição e ordenação; dinheiro e vencedor saem sempre da tabela de lances.
  @Column({ name: 'current_bid', type: 'integer', nullable: true })
  currentBid!: number | null;

  @Column({ name: 'bid_count', type: 'integer', default: 0 })
  bidCount!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
