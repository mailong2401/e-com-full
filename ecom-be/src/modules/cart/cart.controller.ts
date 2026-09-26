// src/modules/cart/cart.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/modules/auth/decorators/current-user.decorator';
import { User } from '../user/user.entity';
import { DeviceId } from 'src/common/decorators/device-id.decorator';

@Controller('carts')
export class CartController {
  constructor(private readonly cartService: CartService) { }

  // ============================================================
  // GET MY CART (user hoặc guest)
  // ============================================================

  /**
   * Lấy cart hiện tại (tự động tạo nếu chưa có)
   * Rate limit: 100 lần / phút
   */
  @Get('me')
  @Throttle({ default: { ttl: 60_000, limit: 100 } })
  async getMyCart(
    @CurrentUser() user: User | undefined,
    @DeviceId() deviceId: string,
  ) {
    return await this.cartService.getMyCart(user?.id ?? null, deviceId);
  }

  // ============================================================
  // ADD ITEM
  // ============================================================

  /**
   * Thêm sản phẩm vào cart
   * Rate limit: 30 lần / phút
   */
  @Post('items')
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @HttpCode(HttpStatus.OK)
  async addItem(
    @CurrentUser() user: User | undefined,
    @DeviceId() deviceId: string,
    @Body() dto: AddToCartDto,
  ) {
    return await this.cartService.addItem(user?.id ?? null, deviceId, dto);
  }

  // ============================================================
  // UPDATE ITEM
  // ============================================================

  /**
   * Cập nhật số lượng item (quantity = 0 → xóa)
   * Rate limit: 30 lần / phút
   */
  @Patch('items/:itemId')
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  async updateItem(
    @CurrentUser() user: User | undefined,
    @DeviceId() deviceId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return await this.cartService.updateItem(
      user?.id ?? null,
      deviceId,
      itemId,
      dto,
    );
  }

  // ============================================================
  // REMOVE ITEM
  // ============================================================

  /**
   * Xóa 1 item khỏi cart
   * Rate limit: 30 lần / phút
   */
  @Delete('items/:itemId')
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  async removeItem(
    @CurrentUser() user: User | undefined,
    @DeviceId() deviceId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    return await this.cartService.removeItem(
      user?.id ?? null,
      deviceId,
      itemId,
    );
  }

  // ============================================================
  // CLEAR CART
  // ============================================================

  /**
   * Xóa toàn bộ cart
   * Rate limit: 10 lần / phút
   */
  @Delete('me')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  async clearCart(
    @CurrentUser() user: User | undefined,
    @DeviceId() deviceId: string,
  ) {
    return await this.cartService.clearCart(user?.id ?? null, deviceId);
  }

  // ============================================================
  // MERGE GUEST CART (sau khi login)
  // ============================================================

  /**
   * Gộp guest cart vào user cart — gọi sau khi login
   * Rate limit: 5 lần / phút
   */
  @Post('merge')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  async mergeGuestCart(
    @CurrentUser() user: User,
    @DeviceId() deviceId: string,
  ) {
    return await this.cartService.mergeGuestCart(user.id, deviceId);
  }
}
