// ecom-fe/lib/products.ts
import { api } from './api';

export type PaginationMode = 'cursor' | 'offset';

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  salePrice: number | null;
  stock: number;
  category: string;
  brand: string | null;
  images: string[];
  status: 'draft' | 'active' | 'inactive' | 'out_of_stock';
  rating: number;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductQuery {
  search?: string;
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  status?: 'draft' | 'active' | 'inactive' | 'out_of_stock';
  sortBy?: 'createdAt' | 'price' | 'rating' | 'name';
  order?: 'ASC' | 'DESC';
  paginationMode?: PaginationMode;
  cursor?: string;
  page?: number;
  limit?: number;
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
  | CursorPaginatedProducts
  | OffsetPaginatedProducts;

export const productService = {
  /** Cursor mode — sortBy mặc định createdAt (backend chỉ hỗ trợ cursor với createdAt) */
  listCursor: async (
    query: Omit<ProductQuery, 'paginationMode' | 'page'> = {},
  ): Promise<CursorPaginatedProducts> => {
    const { data } = await api.get<CursorPaginatedProducts>('/products', {
      params: {
        ...query,
        paginationMode: 'cursor',
        sortBy: 'createdAt',
        status: query.status ?? 'active',
        limit: query.limit ?? 12,
      },
    });
    return data;
  },

  /** Offset mode — dùng cho UI có nút phân trang, hỗ trợ mọi sortBy */
  listOffset: async (
    query: Omit<ProductQuery, 'paginationMode' | 'cursor'> = {},
  ): Promise<OffsetPaginatedProducts> => {
    const { data } = await api.get<OffsetPaginatedProducts>('/products', {
      params: {
        ...query,
        paginationMode: 'offset',
        status: query.status ?? 'active',
        limit: query.limit ?? 12,
        page: query.page ?? 1,
      },
    });
    return data;
  },

  getBySlug: async (slug: string): Promise<Product> => {
    const { data } = await api.get<Product>(`/products/slug/${slug}`);
    return data;
  },

  getById: async (id: string): Promise<Product> => {
    const { data } = await api.get<Product>(`/products/${id}`);
    return data;
  },
};

/** Giá hiệu lực (đã giảm nếu có sale) */
export const effectivePrice = (p: Product): number =>
  Number(p.salePrice ?? p.price);

/** % giảm giá */
export const discountPercent = (p: Product): number => {
  if (!p.salePrice) return 0;
  const price = Number(p.price);
  const sale = Number(p.salePrice);
  if (sale >= price) return 0;
  return Math.round(((price - sale) / price) * 100);
};

export const formatVnd = (n: number): string =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(n);
