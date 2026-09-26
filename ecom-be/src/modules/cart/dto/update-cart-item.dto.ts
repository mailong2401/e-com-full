// src/modules/cart/dto/update-cart-item.dto.ts
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class UpdateCartItemDto {
  @Type(() => Number)
  @IsInt()
  @Min(0) // 0 = xóa item
  @Max(999)
  quantity!: number;
}
