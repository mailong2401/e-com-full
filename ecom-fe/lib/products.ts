// ecom-fe/lib/products.ts
import { api } from './api';

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
  sortBy?: 'createdAt' | 'price' | 'rating' | 'name';
  order?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
}

export interface PaginatedProducts {
  data: Product[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const productService = {
  list: async (query: ProductQuery = {}): Promise<PaginatedProducts> => {
    const { data } = await api.get<PaginatedProducts>('/products', {
      params: {
        ...query,
        status: 'active', // chỉ hiện sản phẩm đang bán
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
