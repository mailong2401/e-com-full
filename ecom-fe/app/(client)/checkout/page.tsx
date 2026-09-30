// ecom-fe/app/(client)/checkout/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Flex,
  Heading,
  Text,
  Card,
  Button,
  Separator,
  Box,
  RadioGroup,
  Spinner,
  TextField,
  Callout,
} from '@radix-ui/themes';
import { InfoCircledIcon } from '@radix-ui/react-icons';
import { cartService, CartSummary } from '@/lib/cart';
import { paymentService, PaymentProvider } from '@/lib/payment';
import { formatVnd } from '@/lib/products';
import { useToast } from '@/components/toast-provider';
import { useAuth } from '@/hooks/useAuth';

const PROVIDERS: { value: PaymentProvider; label: string; description: string }[] = [
  { value: 'vnpay', label: 'VNPay', description: 'Thẻ ATM, Visa, Master, QR Code' },
  { value: 'momo', label: 'Ví Momo', description: 'Thanh toán qua ví điện tử Momo' },
  { value: 'cod', label: 'COD', description: 'Thanh toán khi nhận hàng' },
];

export default function CheckoutPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [cart, setCart] = useState<CartSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState<PaymentProvider>('vnpay');
  const [submitting, setSubmitting] = useState(false);

  // Form giao hàng
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');

  const fetchCart = useCallback(async () => {
    try {
      const c = await cartService.getMyCart();
      setCart(c);
    } catch (err) {
      toast('error', 'Không thể tải giỏ hàng');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.replace('/login?redirect=/checkout');
      return;
    }
    fetchCart();
  }, [authLoading, isAuthenticated, router, fetchCart]);

  useEffect(() => {
    if (user) {
      setFullName(`${user.firstName} ${user.lastName}`.trim());
      setPhone(user.phone ?? '');
    }
  }, [user]);

  const handleCheckout = async () => {
    if (!cart) return;
    if (!fullName.trim() || !phone.trim() || !address.trim()) {
      toast('error', 'Vui lòng điền đầy đủ thông tin giao hàng');
      return;
    }

    setSubmitting(true);
    try {
      // Gọi API tạo payment — backend sẽ trả về paymentUrl
      const res = await paymentService.create({
        cartId: cart.id,
        provider,
      });

      if (provider === 'cod') {
        toast('success', 'Đặt hàng thành công! Chúng tôi sẽ liên hệ sớm.');
        router.push('/orders');
        return;
      }

      // Chuyển sang cổng thanh toán
      window.location.href = res.paymentUrl;
    } catch (err: any) {
      toast(
        'error',
        err.response?.data?.message ?? 'Không thể tạo thanh toán',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || authLoading) {
    return (
      <Flex justify="center" py="9">
        <Spinner size="3" />
      </Flex>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <Container size="4" px="4" py="6">
        <Card size="3" style={{ padding: '60px 20px' }}>
          <Flex direction="column" align="center" gap="3">
            <Text color="gray">Giỏ hàng trống, không thể thanh toán</Text>
            <Button onClick={() => router.push('/products')}>
              Về trang sản phẩm
            </Button>
          </Flex>
        </Card>
      </Container>
    );
  }

  return (
    <Container size="4" px="4" py="6">
      <Heading size="7" mb="5">
        Thanh toán
      </Heading>

      <Flex gap="5" direction={{ initial: 'column', md: 'row' }}>
        {/* Left: Form + Provider */}
        <Flex direction="column" gap="4" style={{ flex: 1 }}>
          <Card size="3">
            <Flex direction="column" gap="3">
              <Heading size="4">Thông tin giao hàng</Heading>
              <Separator size="4" />

              <Box>
                <Text as="label" size="2" weight="bold" mb="1">
                  Họ và tên
                </Text>
                <TextField.Root
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                />
              </Box>

              <Box>
                <Text as="label" size="2" weight="bold" mb="1">
                  Số điện thoại
                </Text>
                <TextField.Root
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0901234567"
                />
              </Box>

              <Box>
                <Text as="label" size="2" weight="bold" mb="1">
                  Địa chỉ nhận hàng
                </Text>
                <TextField.Root
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Số nhà, đường, phường, quận, tỉnh/thành"
                />
              </Box>

              <Box>
                <Text as="label" size="2" weight="bold" mb="1">
                  Ghi chú (tùy chọn)
                </Text>
                <TextField.Root
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Giao giờ hành chính, gọi trước khi giao..."
                />
              </Box>
            </Flex>
          </Card>

          <Card size="3">
            <Flex direction="column" gap="3">
              <Heading size="4">Phương thức thanh toán</Heading>
              <Separator size="4" />

              <RadioGroup.Root
                value={provider}
                onValueChange={(v) => setProvider(v as PaymentProvider)}
              >
                <Flex direction="column" gap="3">
                  {PROVIDERS.map((p) => (
                    <Box
                      key={p.value}
                      style={{
                        padding: 12,
                        border: '1px solid var(--gray-5)',
                        borderRadius: 8,
                        cursor: 'pointer',
                        backgroundColor:
                          provider === p.value
                            ? 'var(--accent-a2)'
                            : 'transparent',
                      }}
                      onClick={() => setProvider(p.value)}
                    >
                      <Flex align="start" gap="3">
                        <RadioGroup.Item value={p.value} />
                        <Flex direction="column" gap="1" style={{ flex: 1 }}>
                          <Text size="2" weight="bold">
                            {p.label}
                          </Text>
                          <Text size="1" color="gray">
                            {p.description}
                          </Text>
                        </Flex>
                      </Flex>
                    </Box>
                  ))}
                </Flex>
              </RadioGroup.Root>
            </Flex>
          </Card>
        </Flex>

        {/* Right: Order summary */}
        <Box style={{ width: '100%', maxWidth: 400 }}>
          <Card size="3">
            <Flex direction="column" gap="3">
              <Heading size="4">Đơn hàng của bạn</Heading>
              <Separator size="4" />

              {/* Item list */}
              <Flex direction="column" gap="2" style={{ maxHeight: 240, overflowY: 'auto' }}>
                {cart.items.map((item) => (
                  <Flex key={item.id} justify="between" align="start" gap="2">
                    <Flex direction="column" style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        size="2"
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.name}
                      </Text>
                      <Text size="1" color="gray">
                        x{item.quantity}
                      </Text>
                    </Flex>
                    <Text size="2">{formatVnd(item.subtotal)}</Text>
                  </Flex>
                ))}
              </Flex>

              <Separator size="4" />

              <Flex justify="between">
                <Text size="2" color="gray">
                  Tạm tính
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

              <Flex justify="between">
                <Text size="2" color="gray">
                  Phí vận chuyển
                </Text>
                <Text size="2">Miễn phí</Text>
              </Flex>

              <Separator size="4" />

              <Flex justify="between" align="baseline">
                <Text size="3" weight="bold">
                  Tổng cộng
                </Text>
                <Heading size="6" color="red">
                  {formatVnd(cart.total)}
                </Heading>
              </Flex>

              <Callout.Root color="blue" size="1" mt="2">
                <Callout.Icon>
                  <InfoCircledIcon />
                </Callout.Icon>
                <Callout.Text>
                  Đơn hàng sẽ được chuyển sang cổng thanh toán sau khi xác nhận.
                </Callout.Text>
              </Callout.Root>

              <Button
                size="3"
                variant="solid"
                disabled={submitting}
                onClick={handleCheckout}
                style={{ cursor: 'pointer', marginTop: 8 }}
              >
                {submitting ? 'Đang xử lý...' : 'Đặt hàng & Thanh toán'}
              </Button>
            </Flex>
          </Card>
        </Box>
      </Flex>
    </Container>
  );
}
