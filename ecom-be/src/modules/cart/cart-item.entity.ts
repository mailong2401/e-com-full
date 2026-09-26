// src/modules/cart/cart-item.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Cart } from './cart.entity';
import { Product } from '../product/product.entity';

@Entity('cart_items')
@Unique(['cartId', 'productId']) // 1 cart chỉ có 1 row cho 1 product
@Index(['cartId'])
export class CartItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'cart_id', type: 'uuid' })
  cartId!: string;

  @ManyToOne(() => Cart, (cart) => cart.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cart_id' })
  cart!: Cart;

  @Column({ name: 'product_id', type: 'uuid' })
  productId!: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'product_id' })
  product!: Product;

  @Column({ name: 'quantity', type: 'int', default: 1 })
  quantity!: number;

  // Snapshot giá tại thời điểm thêm vào cart
  // → nếu giá product thay đổi, cart vẫn giữ giá cũ để so sánh
  @Column({
    name: 'price_snapshot',
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  priceSnapshot!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
