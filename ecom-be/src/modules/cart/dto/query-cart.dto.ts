// src/modules/cart/dto/query-cart.dto.ts
import { IsIn, IsOptional } from 'class-validator';

export class QueryCartDto {
  @IsIn(['true', 'false'])
  @IsOptional()
  withProductDetails?: string; // 'true' | 'false'
}
