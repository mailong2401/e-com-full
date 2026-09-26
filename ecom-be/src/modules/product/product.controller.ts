// src/modules/product/product.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import { Roles } from 'src/modules/auth/decorators/roles.decorator';
import { UserRole } from 'src/common/enums/user-role.enum';
import { Product } from './product.entity';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) { }

  // ============================================================
  // PUBLIC — LIST & SEARCH
  // ============================================================

  /**
   * Public: list sản phẩm với filter/search/sort/pagination
   * Rate limit: 100 lần / phút
   */
  @Get()
  @Throttle({ default: { ttl: 60_000, limit: 100 } })
  async findAll(@Query() query: QueryProductDto) {
    return await this.productService.findAll(query);
  }

  /**
   * Public: xem chi tiết theo slug (SEO friendly)
   * Rate limit: 100 lần / phút
   */
  @Get('slug/:slug')
  @Throttle({ default: { ttl: 60_000, limit: 100 } })
  async findBySlug(@Param('slug') slug: string) {
    return await this.productService.findBySlug(slug);
  }

  /**
   * Public: xem chi tiết theo id
   * Rate limit: 100 lần / phút
   */
  @Get(':id')
  @Throttle({ default: { ttl: 60_000, limit: 100 } })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return await this.productService.findOne(id);
  }

  // ============================================================
  // ADMIN — CRUD
  // ============================================================

  /**
   * Admin tạo sản phẩm
   * Rate limit: 30 lần / phút
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateProductDto) {
    return await this.productService.create(dto);
  }

  /**
   * Admin update sản phẩm
   * Rate limit: 30 lần / phút
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return await this.productService.update(id, dto);
  }

  /**
   * Admin đổi status
   * Rate limit: 30 lần / phút
   */
  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: Product['status'],
  ) {
    return await this.productService.update(id, { status });
  }

  /**
   * Admin xóa sản phẩm
   * Rate limit: 20 lần / phút
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.productService.remove(id);
  }
}
