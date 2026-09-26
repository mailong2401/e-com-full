// src/modules/cart/cart.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull, FindOptionsWhere } from 'typeorm';
import { Cart, CartStatus } from './cart.entity';
import { CartItem } from './cart-item.entity';
import { Product } from '../product/product.entity';
import { ProductStatus } from 'src/common/enums/product-status.enum';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { RedisService } from 'src/infrastructure/redis/redis.service';

export interface CartSummary {
  id: string;
  items: Array<{
    id: string;
    productId: string;
    name: string;
    image: string | null;
    price: number;
    salePrice: number | null;
    quantity: number;
    subtotal: number;
    priceChanged: boolean;
    stockAvailable: number;
    inStock: boolean;
  }>;
  totalItems: number;
  totalQuantity: number;
  subtotal: number;
  discount: number;
  total: number;
}

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);
  private readonly CART_CACHE_TTL = 300; // 5 phút

  constructor(
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly redis: RedisService,
    private readonly dataSource: DataSource,
  ) { }

  // ============================================================
  // CACHE HELPERS
  // ============================================================

  private cacheKey(cartId: string): string {
    return `cart:summary:${cartId}`;
  }

  private async invalidateCache(cartId: string): Promise<void> {
    await this.redis.del(this.cacheKey(cartId));
  }

  // ============================================================
  // GET OR CREATE CART
  // ============================================================

  /**
   * Lấy cart đang active của user/device
   * Nếu chưa có → tạo mới
   */
  async getOrCreateCart(
    userId: string | null,
    deviceId: string | null,
  ): Promise<Cart> {
    if (!userId && !deviceId) {
      throw new BadRequestException('Either userId or deviceId is required');
    }

    let cart: Cart | null;

    if (userId) {
      cart = await this.cartRepository.findOne({
        where: { userId, status: CartStatus.ACTIVE },
      });
    } else {
      cart = await this.cartRepository.findOne({
        where: {
          deviceId: deviceId as string,
          userId: IsNull(),
          status: CartStatus.ACTIVE,
        },
      });
    }

    if (!cart) {
      cart = this.cartRepository.create({
        userId,
        deviceId,
        status: CartStatus.ACTIVE,
        items: [],
      });
      cart = await this.cartRepository.save(cart);
      this.logger.log(
        `Cart created: ${cart.id} (user=${userId ?? 'guest'}, device=${deviceId})`,
      );
    }

    return cart;
  }

  // ============================================================
  // ADD ITEM
  // ============================================================

  async addItem(
    userId: string | null,
    deviceId: string | null,
    dto: AddToCartDto,
  ): Promise<CartSummary> {
    const cart = await this.getOrCreateCart(userId, deviceId);

    // Validate product
    const product = await this.productRepository.findOne({
      where: { id: dto.productId },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    if (product.status !== ProductStatus.ACTIVE) {
      throw new BadRequestException('Product is not available for purchase');
    }

    // Tìm item có sẵn trong cart
    let item = await this.cartItemRepository.findOne({
      where: { cartId: cart.id, productId: dto.productId },
    });

    const newQuantity = (item?.quantity ?? 0) + dto.quantity;

    if (newQuantity > product.stock) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${product.stock}, in cart: ${item?.quantity ?? 0}`,
      );
    }

    // Giá hiệu lực (salePrice nếu có, ngược lại price)
    const effectivePrice = product.salePrice ?? product.price;

    if (item) {
      item.quantity = newQuantity;
      await this.cartItemRepository.save(item);
    } else {
      item = this.cartItemRepository.create({
        cartId: cart.id,
        productId: dto.productId,
        quantity: dto.quantity,
        priceSnapshot: effectivePrice,
      });
      await this.cartItemRepository.save(item);
    }

    // Touch cart để cập nhật updatedAt
    cart.updatedAt = new Date();
    await this.cartRepository.save(cart);

    await this.invalidateCache(cart.id);
    this.logger.log(
      `Cart item added: cart=${cart.id} product=${dto.productId} qty=${dto.quantity}`,
    );

    return this.getSummary(cart.id);
  }

  // ============================================================
  // UPDATE ITEM
  // ============================================================

  async updateItem(
    userId: string | null,
    deviceId: string | null,
    itemId: string,
    dto: UpdateCartItemDto,
  ): Promise<CartSummary> {
    const cart = await this.getOrCreateCart(userId, deviceId);

    const item = await this.cartItemRepository.findOne({
      where: { id: itemId, cartId: cart.id },
    });
    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    // quantity = 0 → xóa item
    if (dto.quantity === 0) {
      await this.cartItemRepository.remove(item);
      await this.invalidateCache(cart.id);
      return this.getSummary(cart.id);
    }

    const product = await this.productRepository.findOne({
      where: { id: item.productId },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    if (dto.quantity > product.stock) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${product.stock}`,
      );
    }

    item.quantity = dto.quantity;
    // Cập nhật snapshot giá mới (vì user đang chủ động thay đổi)
    item.priceSnapshot = product.salePrice ?? product.price;
    await this.cartItemRepository.save(item);

    cart.updatedAt = new Date();
    await this.cartRepository.save(cart);

    await this.invalidateCache(cart.id);
    return this.getSummary(cart.id);
  }

  // ============================================================
  // REMOVE ITEM
  // ============================================================

  async removeItem(
    userId: string | null,
    deviceId: string | null,
    itemId: string,
  ): Promise<CartSummary> {
    const cart = await this.getOrCreateCart(userId, deviceId);

    const item = await this.cartItemRepository.findOne({
      where: { id: itemId, cartId: cart.id },
    });
    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    await this.cartItemRepository.remove(item);
    await this.invalidateCache(cart.id);
    return this.getSummary(cart.id);
  }

  // ============================================================
  // CLEAR CART
  // ============================================================

  async clearCart(
    userId: string | null,
    deviceId: string | null,
  ): Promise<{ message: string }> {
    const cart = await this.getOrCreateCart(userId, deviceId);
    await this.cartItemRepository.delete({ cartId: cart.id });
    await this.invalidateCache(cart.id);
    return { message: 'Cart cleared' };
  }

  // ============================================================
  // GET SUMMARY
  // ============================================================

  /**
   * Trả về summary của cart với cache Redis
   */
  async getSummary(cartId: string): Promise<CartSummary> {
    // 1. Try cache
    const cached = await this.redis.getJson<CartSummary>(this.cacheKey(cartId));
    if (cached) return cached;

    // 2. Load từ DB
    const cart = await this.cartRepository.findOne({
      where: { id: cartId },
      relations: {
        items: {
          product: true,
        },
      },
    });
    if (!cart) throw new NotFoundException('Cart not found');

    const summary = this.buildSummary(cart);

    // 3. Cache
    await this.redis.setJson(
      this.cacheKey(cartId),
      summary,
      this.CART_CACHE_TTL,
    );

    return summary;
  }

  async getMyCart(
    userId: string | null,
    deviceId: string | null,
  ): Promise<CartSummary> {
    const cart = await this.getOrCreateCart(userId, deviceId);
    return this.getSummary(cart.id);
  }

  // ============================================================
  // HELPERS
  // ============================================================

  private buildSummary(cart: Cart): CartSummary {
    let subtotal = 0;
    let discount = 0;
    let totalQuantity = 0;

    const items = (cart.items ?? []).map((item) => {
      const product = item.product;
      const currentPrice = Number(product.salePrice ?? product.price);
      const snapshotPrice = Number(item.priceSnapshot);
      const priceChanged = currentPrice !== snapshotPrice;

      // Dùng giá hiện tại để tính tiền (giá user sẽ trả khi checkout)
      const effectivePrice = currentPrice;
      const originalPrice = Number(product.price);

      const subtotalItem = effectivePrice * item.quantity;
      const discountItem = (originalPrice - effectivePrice) * item.quantity;

      subtotal += originalPrice * item.quantity;
      discount += discountItem;
      totalQuantity += item.quantity;

      return {
        id: item.id,
        productId: product.id,
        name: product.name,
        image: product.images?.[0] ?? null,
        price: originalPrice,
        salePrice: product.salePrice ? Number(product.salePrice) : null,
        quantity: item.quantity,
        subtotal: subtotalItem,
        priceChanged,
        stockAvailable: product.stock,
        inStock: product.stock >= item.quantity,
      };
    });

    const total = subtotal - discount;

    return {
      id: cart.id,
      items,
      totalItems: items.length,
      totalQuantity,
      subtotal: this.round(subtotal),
      discount: this.round(discount),
      total: this.round(total),
    };
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }

  // ============================================================
  // MERGE GUEST CART → USER CART (khi login)
  // ============================================================

  /**
   * Gộp cart của guest (deviceId) vào cart của user khi user login
   * Gọi từ AuthService sau khi login thành công
   */
  async mergeGuestCart(userId: string, deviceId: string): Promise<CartSummary> {
    const guestCart = await this.cartRepository.findOne({
      where: { deviceId, status: CartStatus.ACTIVE, userId: IsNull() },
      relations: {
        items: true,
      },
    });

    if (!guestCart || !guestCart.items?.length) {
      // Không có guest cart → trả về user cart hiện tại
      return this.getMyCart(userId, deviceId);
    }

    // Tìm hoặc tạo user cart
    const userCart = await this.getOrCreateCart(userId, deviceId);

    // Nếu guest cart trùng với user cart → xóa guest cart
    if (userCart.id === guestCart.id) {
      return this.getSummary(userCart.id);
    }

    // Merge từng item
    for (const guestItem of guestCart.items) {
      const existing = await this.cartItemRepository.findOne({
        where: { cartId: userCart.id, productId: guestItem.productId },
      });

      if (existing) {
        // Cộng quantity, cap ở stock hiện tại
        const product = await this.productRepository.findOne({
          where: { id: guestItem.productId },
        });
        const maxQty = product?.stock ?? existing.quantity;
        existing.quantity = Math.min(
          existing.quantity + guestItem.quantity,
          maxQty,
        );
        await this.cartItemRepository.save(existing);
      } else {
        // Chuyển item sang user cart
        guestItem.cartId = userCart.id;
        await this.cartItemRepository.save(guestItem);
      }
    }

    // Xóa guest cart
    await this.cartRepository.remove(guestCart);
    await this.invalidateCache(userCart.id);

    this.logger.log(`Guest cart merged: device=${deviceId} → user=${userId}`);

    return this.getSummary(userCart.id);
  }

  // ============================================================
  // CHECKOUT (được gọi từ Order module sau này)
  // ============================================================

  /**
   * Đánh dấu cart đã checkout → chuyển status
   * Order module sẽ đọc snapshot cart rồi gọi hàm này
   */
  async markAsCheckedOut(cartId: string): Promise<void> {
    await this.cartRepository.update(cartId, {
      status: CartStatus.CHECKED_OUT,
    });
    await this.invalidateCache(cartId);
  }

  /**
   * Validate cart trước khi checkout
   * Trả về danh sách lỗi (nếu có) để Order module quyết định
   */
  async validateForCheckout(cartId: string): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const cart = await this.cartRepository.findOne({
      where: { id: cartId },
      relations: {
        items: {
          product: true,
        },
      },
    });
    if (!cart) throw new NotFoundException('Cart not found');

    const errors: string[] = [];

    if (!cart.items?.length) {
      errors.push('Cart is empty');
    }

    for (const item of cart.items ?? []) {
      if (item.product.status !== ProductStatus.ACTIVE) {
        errors.push(`Product "${item.product.name}" is not available`);
      }
      if (item.product.stock < item.quantity) {
        errors.push(
          `Product "${item.product.name}" only has ${item.product.stock} in stock`,
        );
      }
    }

    return { valid: errors.length === 0, errors };
  }
}
