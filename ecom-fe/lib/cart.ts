// ecom-fe/lib/cart.ts
import { api } from './api';

export interface CartItem {
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
}

export interface CartSummary {
  id: string;
  items: CartItem[];
  totalItems: number;
  totalQuantity: number;
  subtotal: number;
  discount: number;
  total: number;
}

export const cartService = {
  getMyCart: async (): Promise<CartSummary> => {
    const { data } = await api.get<CartSummary>('/carts/me');
    return data;
  },

  addItem: async (productId: string, quantity: number): Promise<CartSummary> => {
    const { data } = await api.post<CartSummary>('/carts/items', {
      productId,
      quantity,
    });
    return data;
  },

  updateItem: async (itemId: string, quantity: number): Promise<CartSummary> => {
    const { data } = await api.patch<CartSummary>(`/carts/items/${itemId}`, {
      quantity,
    });
    return data;
  },

  removeItem: async (itemId: string): Promise<CartSummary> => {
    const { data } = await api.delete<CartSummary>(`/carts/items/${itemId}`);
    return data;
  },

  clearCart: async (): Promise<{ message: string }> => {
    const { data } = await api.delete<{ message: string }>('/carts/me');
    return data;
  },
};
