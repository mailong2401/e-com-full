// src/modules/product/product.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Product } from './product.entity';
import { ProductStatus } from 'src/common/enums/product-status.enum';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto, PaginationMode } from './dto/query-product.dto';
import { ProductSortBy } from 'src/common/enums/product-sort-by.enum';
import { CacheService } from 'src/common/utils/cache.util';

export interface CursorPaginatedProducts {
  data: Product[];
  meta: {
    paginationMode: 'cursor';
    limit: number;
    nextCursor: string | null;
    hasNextPage: boolean;
  };
}

export interface OffsetPaginatedProducts {
  data: Product[];
  meta: {
    paginationMode: 'offset';
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export type PaginatedProducts =
  CursorPaginatedProducts | OffsetPaginatedProducts;

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
  async findAll(query: QueryProductDto): Promise<PaginatedProducts> {
    const {
      search,
      category,
      brand,
      minPrice,
      maxPrice,
      status,
      sortBy = ProductSortBy.CREATED_AT,
      order = 'DESC',
      paginationMode = PaginationMode.CURSOR,
      cursor,
      page = 1,
      limit = 20,
    } = query;

    const hasSearch = !!search && search.trim().length > 0;

    // ==================== OFFSET MODE ====================
    if (paginationMode === PaginationMode.OFFSET) {
      const qb = this.productRepository.createQueryBuilder('p');
      this.applyFilters(qb, {
        search,
        category,
        brand,
        minPrice,
        maxPrice,
        status,
      });

      // Nếu có search → ưu tiên rank, sau đó mới đến sortBy
      if (hasSearch) {
        qb.addSelect(
          `ts_rank(p.search_vector, websearch_to_tsquery('simple', immutable_unaccent(:rankQuery)))`,
          'rank',
        ).setParameter('rankQuery', search.trim());
        qb.orderBy('rank', 'DESC');
        // Secondary sort để stable
        const sortField = Object.values(ProductSortBy).includes(sortBy)
          ? sortBy
          : ProductSortBy.CREATED_AT;
        const sortDir = order === 'ASC' ? 'ASC' : 'DESC';
        qb.addOrderBy(`p.${sortField}`, sortDir).addOrderBy('p.id', 'DESC');
      } else {
        const sortField = Object.values(ProductSortBy).includes(sortBy)
          ? sortBy
          : ProductSortBy.CREATED_AT;
        const sortDir = order === 'ASC' ? 'ASC' : 'DESC';
        qb.orderBy(`p.${sortField}`, sortDir).addOrderBy('p.id', 'DESC');
      }

      qb.skip((page - 1) * limit).take(limit);

      const [data, total] = await qb.getManyAndCount();

      return {
        data,
        meta: {
          paginationMode: 'offset',
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    }

    // ==================== CURSOR MODE ====================
    // Cursor mode + search → không dùng rank được vì rank không ổn định giữa các page
    // Khuyến nghị: dùng offset mode khi có search
    if (hasSearch) {
      throw new BadRequestException(
        'Cursor pagination không hỗ trợ search. Dùng paginationMode=offset.',
      );
    }

    if (sortBy !== ProductSortBy.CREATED_AT) {
      throw new BadRequestException(
        'Cursor pagination chỉ hỗ trợ sortBy=createdAt. ' +
        'Dùng paginationMode=offset cho sortBy khác.',
      );
    }

    const qb = this.productRepository.createQueryBuilder('p');
    this.applyFilters(qb, {
      search,
      category,
      brand,
      minPrice,
      maxPrice,
      status,
    });

    const sortDir = order === 'ASC' ? 'ASC' : 'DESC';
    qb.orderBy('p.id', sortDir);

    if (cursor) {
      if (sortDir === 'DESC') {
        qb.andWhere('p.id < :cursor', { cursor });
      } else {
        qb.andWhere('p.id > :cursor', { cursor });
      }
    }

    qb.take(limit + 1);
    const products = await qb.getMany();
    const hasNextPage = products.length > limit;
    if (hasNextPage) products.pop();

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
  // Helper: apply filters dùng chung cho cả 2 mode
  private applyFilters(
    qb: SelectQueryBuilder<Product>,
    f: {
      search?: string;
      category?: string;
      brand?: string;
      minPrice?: number;
      maxPrice?: number;
      status?: ProductStatus;
    },
  ): void {
    // ===== FTS: dùng websearch_to_tsquery để hỗ trợ cú pháp tự nhiên =====
    if (f.search && f.search.trim().length > 0) {
      qb.andWhere(
        `p.search_vector @@ websearch_to_tsquery('simple', immutable_unaccent(:search))`,
        { search: f.search.trim() },
      );
    }

    if (f.category)
      qb.andWhere('p.category = :category', { category: f.category });
    if (f.brand) qb.andWhere('p.brand = :brand', { brand: f.brand });
    if (f.status) qb.andWhere('p.status = :status', { status: f.status });
    if (f.minPrice !== undefined)
      qb.andWhere('p.price >= :minPrice', { minPrice: f.minPrice });
    if (f.maxPrice !== undefined)
      qb.andWhere('p.price <= :maxPrice', { maxPrice: f.maxPrice });
  }

  /**
   * Search chuyên dụng với ranking và highlight
   */
  async searchWithRank(query: string, limit = 20) {
    if (!query || query.trim().length === 0) {
      return { data: [], total: 0 };
    }

    const qb = this.productRepository
      .createQueryBuilder('p')
      .addSelect(
        `ts_rank(p.search_vector, websearch_to_tsquery('simple', immutable_unaccent(:q)))`,
        'rank',
      )
      .addSelect(
        `ts_headline('simple', immutable_unaccent(p.name), websearch_to_tsquery('simple', immutable_unaccent(:q)), 'StartSel=<mark>, StopSel=</mark>, MaxWords=20')`,
        'highlight',
      )
      .where(
        `p.search_vector @@ websearch_to_tsquery('simple', immutable_unaccent(:q))`,
        { q: query.trim() },
      )
      .andWhere('p.status = :status', { status: ProductStatus.ACTIVE })
      .orderBy('rank', 'DESC')
      .addOrderBy('p.created_at', 'DESC')
      .take(limit);

    const { entities, raw } = await qb.getRawAndEntities();

    // Gắn rank và highlight vào entity
    const data = entities.map((product, idx) => ({
      ...product,
      rank: parseFloat(raw[idx].rank),
      highlight: raw[idx].highlight,
    }));

    return { data, total: data.length };
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
