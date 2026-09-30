// ecom-fe/hooks/useCartCount.ts
'use client';

import { useEffect, useState, useCallback } from 'react';
import { cartService } from '@/lib/cart';

export function useCartCount() {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const cart = await cartService.getMyCart();
      setCount(cart.totalQuantity);
    } catch {
      setCount(0);
    }
  }, []);

  useEffect(() => {
    refresh();
    // Refresh khi tab được focus lại (user quay lại sau khi thanh toán)
    const handler = () => refresh();
    window.addEventListener('focus', handler);
    return () => window.removeEventListener('focus', handler);
  }, [refresh]);

  return { count, refresh };
}
