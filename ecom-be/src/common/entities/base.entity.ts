// src/common/entities/base.entity.ts
import { PrimaryColumn, BeforeInsert } from 'typeorm';
import { v7 as uuidv7 } from 'uuid';

export abstract class BaseEntity {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @BeforeInsert()
  protected generateId() {
    if (!this.id) {
      this.id = uuidv7();
    }
  }
}
