// ecom-fe/app/(client)/cart/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Container,
  Flex,
  Heading,
  Text,
  Card,
  Button,
  Separator,
  Box,
  Spinner,
} from '@radix-ui/themes';
import { TrashIcon, ArrowRightIcon } from '@radix-ui/react-icons';
import { cartService, CartSummary } from '@/lib/cart';
import { formatVnd } from '@/lib/products';
import { CartItemRow } from '@/components/cart-item-row';
import { useToast } from '@/components/toast-provider';

export default function CartPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [cart, setCart] = useState<CartSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchCart = useCallback(async () => {
    try {
      setCart(await cartService.getMyCart());
    } catch (err) {
      console.error(err);
      toast('error', 'Không thể tải giỏ hàng');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const handleUpdate = async (itemId: string, quantity: number) => {
    setUpdating(true);
    try {
      setCart(await cartService.updateItem(itemId, quantity));
    } catch (err: any) {
      toast('error', err.response?.data?.message ?? 'Không thể cập nhật');
    } finally {
      setUpdating(false);
    }
  };

  const handleRemove = async (itemId: string) => {
    setUpdating(true);
    try {
      setCart(await cartService.removeItem(itemId));
      toast('success', 'Đã xoá sản phẩm');
    } catch (err: any) {
      toast('error', err.response?.data?.message ?? 'Không thể xoá');
    } finally {
      setUpdating(false);
    }
  };

  const handleClear = async () => {
    if (!confirm('Bạn có chắc muốn xoá toàn bộ giỏ hàng?')) return;
    setUpdating(true);
    try {
      await cartService.clearCart();
      await fetchCart();
      toast('success', 'Đã xoá giỏ hàng');
    } catch (err: any) {
      toast('error', 'Không thể xoá giỏ hàng');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <Flex justify="center" py="9">
        <Spinner size="3" />
      </Flex>
    );
  }

  const isEmpty = !cart || cart.items.length === 0;

  return (
    <Container size="4" px="4" py="6">
      <Flex justify="between" align="center" mb="5">
        <Heading size="7">Giỏ hàng</Heading>
        {!isEmpty && (
          <Button
            variant="ghost"
            color="red"
            disabled={updating}
            onClick={handleClear}
          >
            <TrashIcon /> Xoá tất cả
          </Button>
        )}
      </Flex>

      {isEmpty ? (
        <Card size="3" style={{ padding: '60px 20px' }}>
          <Flex direction="column" align="center" gap="3">
            <Text color="gray">Giỏ hàng của bạn đang trống</Text>
            <Link href="/products" style={{ textDecoration: 'none' }}>
              <Button size="3">
                Mua sắm ngay <ArrowRightIcon />
              </Button>
            </Link>
          </Flex>
        </Card>
      ) : (
        <Flex gap="5" direction={{ initial: 'column', md: 'row' }}>
          {/* Items */}
          <Box style={{ flex: 1 }}>
            <Card size="2" style={{ padding: 0, overflow: 'hidden' }}>
              {cart.items.map((item) => (
                <CartItemRow
                  key={item.id}
                  item={item}
                  updating={updating}
                  onUpdateQuantity={handleUpdate}
                  onRemove={handleRemove}
                />
              ))}
            </Card>
          </Box>

          {/* Summary */}
          <Box style={{ width: '100%', maxWidth: 360 }}>
            <Card size="3">
              <Flex direction="column" gap="3">
                <Heading size="4">Tổng đơn hàng</Heading>
                <Separator size="4" />

                <Flex justify="between">
                  <Text size="2" color="gray">
                    Tạm tính ({cart.totalQuantity} sản phẩm)
                  </Text>
                  <Text size="2">{formatVnd(cart.subtotal)}</Text>
                </Flex>

                {cart.discount > 0 && (
                  <Flex justify="between">
                    <Text size="2" color="gray">
                      Giảm giá
                    </Text>
                    <Text size="2" color="red">
                      -{formatVnd(cart.discount)}
                    </Text>
                  </Flex>
                )}

                <Separator size="4" />

                <Flex justify="between" align="baseline">
                  <Text size="3" weight="bold">
                    Tổng cộng
                  </Text>
                  <Heading size="6" color="red">
                    {formatVnd(cart.total)}
                  </Heading>
                </Flex>

                <Button
                  size="3"
                  variant="solid"
                  disabled={updating}
                  onClick={() => router.push('/checkout')}
                  style={{ cursor: 'pointer', marginTop: 8 }}
                >
                  Tiến hành thanh toán <ArrowRightIcon />
                </Button>

                <Link href="/products" style={{ textDecoration: 'none' }}>
                  <Button size="2" variant="soft" style={{ width: '100%' }}>
                    Tiếp tục mua sắm
                  </Button>
                </Link>
              </Flex>
            </Card>
          </Box>
        </Flex>
      )}
    </Container>
  );
}
