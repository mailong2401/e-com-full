// src/modules/cart/dto/add-to-cart.dto.ts
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsUUID, Max, Min } from 'class-validator';

export class AddToCartDto {
  @IsUUID()
  @IsNotEmpty()
  productId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(999)
  quantity!: number;
}
