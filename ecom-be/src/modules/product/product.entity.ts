// src/modules/product/product.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  UpdateDateColumn,
} from 'typeorm';
import { ProductStatus } from 'src/common/enums/product-status.enum';
import { BaseEntity } from 'src/common/entities/base.entity';

@Entity('products')
@Index(['status', 'createdAt'])
@Index(['category'])
export class Product extends BaseEntity {
  @Column({ name: 'name', type: 'varchar', length: 255 })
  name!: string;

  @Column({ name: 'slug', type: 'varchar', length: 300, unique: true })
  slug!: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'price', type: 'decimal', precision: 12, scale: 2 })
  price!: number;

  @Column({
    name: 'sale_price',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  salePrice!: number | null;

  @Column({ name: 'stock', type: 'int', default: 0 })
  stock!: number;

  @Column({ name: 'category', type: 'varchar', length: 100 })
  category!: string;

  @Column({ name: 'brand', type: 'varchar', length: 100, nullable: true })
  brand!: string | null;

  @Column({ name: 'images', type: 'jsonb', default: () => "'[]'::jsonb" })
  images!: string[];

  @Column({
    name: 'status',
    type: 'enum',
    enum: ProductStatus,
    default: ProductStatus.DRAFT,
  })
  status!: ProductStatus;

  @Column({
    name: 'rating',
    type: 'decimal',
    precision: 3,
    scale: 2,
    default: 0,
  })
  rating!: number;

  @Column({ name: 'review_count', type: 'int', default: 0 })
  reviewCount!: number;

  // Cột search_vector do PostgreSQL tự sinh
  // select: false → không trả về trong query thông thường (tiết kiệm băng thông)
  // insert/update: false → TypeORM không bao giờ ghi vào cột này
  @Column({
    name: 'search_vector',
    type: 'tsvector',
    select: false,
    insert: false,
    update: false,
    nullable: true,
  })
  searchVector?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
