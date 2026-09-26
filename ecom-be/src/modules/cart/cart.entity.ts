// src/modules/cart/cart.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CartItem } from './cart-item.entity';

export enum CartStatus {
  ACTIVE = 'active',
  CHECKED_OUT = 'checked_out',
  ABANDONED = 'abandoned',
}

@Entity('carts')
@Index(['userId'])
@Index(['deviceId'])
@Index(['status', 'updatedAt'])
export class Cart {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Null nếu là guest cart
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId!: string | null;

  // Dùng cho guest cart (device fingerprint)
  @Column({ name: 'device_id', type: 'varchar', length: 100, nullable: true })
  deviceId!: string | null;

  @Column({
    name: 'status',
    type: 'enum',
    enum: CartStatus,
    default: CartStatus.ACTIVE,
  })
  status!: CartStatus;

  @OneToMany(() => CartItem, (item) => item.cart, {
    cascade: true,
    eager: true,
  })
  items!: CartItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
