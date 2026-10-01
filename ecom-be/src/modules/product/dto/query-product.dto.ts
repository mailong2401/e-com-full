// src/modules/product/dto/query-product.dto.ts
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { ProductStatus } from 'src/common/enums/product-status.enum';
import { ProductSortBy } from 'src/common/enums/product-sort-by.enum';

export enum PaginationMode {
  CURSOR = 'cursor',
  OFFSET = 'offset',
}

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

  @IsIn(['ASC', 'DESC'])
  @IsOptional()
  order?: 'ASC' | 'DESC' = 'DESC';

  // ===== Pagination =====
  @IsEnum(PaginationMode)
  @IsOptional()
  paginationMode?: PaginationMode = PaginationMode.CURSOR;

  // Cursor mode
  @IsUUID()
  @IsOptional()
  cursor?: string;

  // Offset mode
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
