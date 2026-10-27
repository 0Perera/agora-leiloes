import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { Lot } from './lot.entity';

// Fora de lots para nenhuma listagem carregar os bytes.
@Entity('lot_images')
export class LotImage {
  @PrimaryColumn({ name: 'lot_id', type: 'integer' })
  lotId!: number;

  @OneToOne(() => Lot)
  @JoinColumn({ name: 'lot_id' })
  lot!: Lot;

  @Column({ name: 'content_type', type: 'varchar' })
  contentType!: string;

  @Column({ type: 'bytea' })
  bytes!: Buffer;
}
