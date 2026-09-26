// src/modules/product/dto/query-product.dto.ts
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ProductStatus } from 'src/common/enums/product-status.enum';
import { ProductSortBy } from 'src/common/enums/product-sort-by.enum';

export class QueryProductDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  brand?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  minPrice?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  maxPrice?: number;

  @IsEnum(ProductStatus)
  @IsOptional()
  status?: ProductStatus;

  @IsEnum(ProductSortBy)
  @IsOptional()
  sortBy?: ProductSortBy = ProductSortBy.CREATED_AT;

  @IsString()
  @IsOptional()
  order?: 'ASC' | 'DESC' = 'DESC';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;
}
