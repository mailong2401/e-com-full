// src/modules/product/product.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './product.entity';
import { ProductStatus } from 'src/common/enums/product-status.enum';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { ProductSortBy } from 'src/common/enums/product-sort-by.enum';
import { CacheService } from 'src/common/utils/cache.util';

export interface PaginatedProducts {
  data: Product[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
export interface CursorPaginatedProducts {
  data: Product[];
  meta: {
    paginationMode: 'cursor';
    limit: number;
    nextCursor: string | null;
    hasNextPage: boolean;
  };
}

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly cache: CacheService,
  ) { }

  /**
   * Sinh slug từ tên sản phẩm
   */
  private slugify(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // bỏ dấu tiếng Việt
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  /**
   * Đảm bảo slug unique — thêm suffix nếu trùng
   */
  private async ensureUniqueSlug(
    baseSlug: string,
    excludeId?: string,
  ): Promise<string> {
    let slug = baseSlug;
    let counter = 1;
    while (true) {
      const existing = await this.productRepository.findOne({
        where: { slug },
      });
      if (!existing || existing.id === excludeId) return slug;
      slug = `${baseSlug}-${counter++}`;
    }
  }

  async create(dto: CreateProductDto): Promise<Product> {
    const baseSlug = this.slugify(dto.name);
    const slug = await this.ensureUniqueSlug(baseSlug);

    // Validate salePrice < price
    if (dto.salePrice && dto.salePrice >= dto.price) {
      throw new BadRequestException('Sale price must be less than price');
    }

    const product = this.productRepository.create({
      ...dto,
      slug,
      images: dto.images ?? [],
      stock: dto.stock ?? 0,
      status: dto.status ?? ProductStatus.DRAFT,
      salePrice: dto.salePrice ?? null,
      brand: dto.brand ?? null,
      description: dto.description ?? null,
    });

    const saved = await this.productRepository.save(product);
    this.logger.log(`Product created: ${saved.id} (${saved.slug})`);
    return saved;
  }

  /**
   * List với filter, search, sort, pagination
   */
  async findAll(query: QueryProductDto): Promise<CursorPaginatedProducts> {
    const {
      search,
      category,
      brand,
      minPrice,
      maxPrice,
      status,
      sortBy = ProductSortBy.CREATED_AT,
      order = 'DESC',
      cursor,
      limit = 20,
    } = query;

    const qb = this.productRepository.createQueryBuilder('p');

    // ============ FILTERS ============
    if (search) {
      qb.andWhere('(p.name ILIKE :search OR p.description ILIKE :search)', {
        search: `%${search}%`,
      });
    }
    if (category) qb.andWhere('p.category = :category', { category });
    if (brand) qb.andWhere('p.brand = :brand', { brand });
    if (status) qb.andWhere('p.status = :status', { status });
    if (minPrice !== undefined)
      qb.andWhere('p.price >= :minPrice', { minPrice });
    if (maxPrice !== undefined)
      qb.andWhere('p.price <= :maxPrice', { maxPrice });

    // ============ SORT ============
    const validSortFields = Object.values(ProductSortBy);
    const sortField = validSortFields.includes(sortBy)
      ? sortBy
      : ProductSortBy.CREATED_AT;
    const sortDir = order === 'ASC' ? 'ASC' : 'DESC';

    // ============ CURSOR LOGIC ============
    const useCursor = sortField === ProductSortBy.CREATED_AT;

    if (useCursor) {
      // Cursor sort theo id (UUIDv7 = time-ordered)
      qb.orderBy('p.id', sortDir);

      if (cursor) {
        // DESC (mới → cũ): id < cursor
        // ASC  (cũ → mới): id > cursor
        if (sortDir === 'DESC') {
          qb.andWhere('p.id < :cursor', { cursor });
        } else {
          qb.andWhere('p.id > :cursor', { cursor });
        }
      }

      // Lấy dư 1 để check còn trang sau không
      qb.take(limit + 1);

      const products = await qb.getMany();

      const hasNextPage = products.length > limit;
      if (hasNextPage) {
        products.pop(); // bỏ item dư
      }

      const nextCursor =
        hasNextPage && products.length > 0
          ? products[products.length - 1].id
          : null;

      return {
        data: products,
        meta: {
          paginationMode: 'cursor',
          limit,
          nextCursor,
          hasNextPage,
        },
      };
    }

    // ============ FALLBACK: OFFSET (khi sort theo cột khác) ============
    qb.orderBy(`p.${sortField}`, sortDir).addOrderBy('p.id', 'DESC'); // secondary sort để ổn định

    // Không có page param nữa → dùng cursor như id
    // Với trường hợp này, cursor = id của item cuối
    // nhưng sort chính không phải id → phải dùng offset
    // → Bạn có thể throw lỗi hoặc fallback default
    throw new BadRequestException(
      'Cursor pagination chỉ hỗ trợ sortBy=createdAt. ' +
      'Với sortBy khác, vui lòng dùng endpoint khác.',
    );
  }

  async findOne(id: string): Promise<Product> {
    const key = `product:${id}`;

    const cached = await this.cache.get<Product>(key);
    if (cached) return cached;

    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    await this.cache.set(key, product, 300);
    return product;
  }

  async findBySlug(slug: string): Promise<Product> {
    const product = await this.productRepository.findOne({ where: { slug } });
    if (!product) {
      throw new NotFoundException(`Product with slug "${slug}" not found`);
    }
    return product;
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);

    const newPrice = dto.price ?? Number(product.price);
    const newSalePrice =
      dto.salePrice !== undefined ? dto.salePrice : product.salePrice;
    if (newSalePrice && newSalePrice >= newPrice) {
      throw new BadRequestException('Sale price must be less than price');
    }

    if (dto.name && dto.name !== product.name) {
      const baseSlug = this.slugify(dto.name);
      product.slug = await this.ensureUniqueSlug(baseSlug, id);
    }

    Object.assign(product, dto);
    const saved = await this.productRepository.save(product);
    await this.cache.del(`product:${id}`);
    this.logger.log(`Product updated: ${saved.id}`);
    return saved;
  }

  async remove(id: string): Promise<void> {
    const product = await this.findOne(id);
    await this.productRepository.remove(product);
    await this.cache.del('product:${id}');
    this.logger.log(`Product removed: ${id}`);
  }

  async decreaseStock(id: string, quantity: number): Promise<Product> {
    const product = await this.findOne(id);

    if (product.stock < quantity) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${product.stock}, requested: ${quantity}`,
      );
    }

    product.stock -= quantity;
    if (product.stock === 0 && product.status === ProductStatus.ACTIVE) {
      product.status = ProductStatus.OUT_OF_STOCK;
    }

    await this.cache.del('product:${id}');
    return await this.productRepository.save(product);
  }

  async increaseStock(id: string, quantity: number): Promise<Product> {
    const product = await this.findOne(id);
    product.stock += quantity;
    if (product.stock > 0 && product.status === ProductStatus.OUT_OF_STOCK) {
      product.status = ProductStatus.ACTIVE;
    }
    await this.cache.del('product:${id}');
    return await this.productRepository.save(product);
  }
}
