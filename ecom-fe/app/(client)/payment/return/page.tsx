// ecom-fe/app/(client)/payment/return/page.tsx
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Container,
  Flex,
  Heading,
  Text,
  Card,
  Button,
  Spinner,
} from '@radix-ui/themes';
import {
  CheckCircledIcon,
  CrossCircledIcon,
  InfoCircledIcon,
} from '@radix-ui/react-icons';

function PaymentReturnContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'success' | 'failed' | 'pending'>('pending');

  useEffect(() => {
    // VNPay: vnp_ResponseCode=00 → success
    // Momo: resultCode=0 → success
    const vnpCode = searchParams.get('vnp_ResponseCode');
    const momoCode = searchParams.get('resultCode');

    if (vnpCode === '00' || momoCode === '0') {
      setStatus('success');
    } else if (vnpCode || momoCode) {
      setStatus('failed');
    } else {
      setStatus('pending');
    }
  }, [searchParams]);

  return (
    <Container size="3" px="4" py="9">
      <Card size="4">
        <Flex direction="column" align="center" gap="4" py="4">
          {status === 'pending' && <Spinner size="3" />}

          {status === 'success' && (
            <>
              <CheckCircledIcon
                width={64}
                height={64}
                color="var(--green-9)"
              />
              <Heading size="6" align="center">
                Thanh toán thành công!
              </Heading>
              <Text size="2" color="gray" align="center">
                Đơn hàng của bạn đã được xác nhận. Chúng tôi sẽ liên hệ để giao hàng.
              </Text>
              <Flex gap="3" mt="2">
                <Button onClick={() => router.push('/orders')} size="3">
                  Xem đơn hàng
                </Button>
                <Button
                  variant="soft"
                  onClick={() => router.push('/products')}
                  size="3"
                >
                  Tiếp tục mua sắm
                </Button>
              </Flex>
            </>
          )}

          {status === 'failed' && (
            <>
              <CrossCircledIcon
                width={64}
                height={64}
                color="var(--red-9)"
              />
              <Heading size="6" align="center">
                Thanh toán thất bại
              </Heading>
              <Text size="2" color="gray" align="center">
                Giao dịch không thành công hoặc đã bị huỷ. Vui lòng thử lại.
              </Text>
              <Flex gap="3" mt="2">
                <Button onClick={() => router.push('/cart')} size="3">
                  Quay lại giỏ hàng
                </Button>
                <Button
                  variant="soft"
                  onClick={() => router.push('/products')}
                  size="3"
                >
                  Về trang sản phẩm
                </Button>
              </Flex>
            </>
          )}

          {status === 'pending' && (
            <>
              <InfoCircledIcon width={64} height={64} color="var(--blue-9)" />
              <Heading size="6" align="center">
                Đang xử lý
              </Heading>
              <Text size="2" color="gray" align="center">
                Vui lòng chờ trong giây lát...
              </Text>
            </>
          )}
        </Flex>
      </Card>
    </Container>
  );
}

export default function PaymentReturnPage() {
  return (
    <Suspense
      fallback={
        <Flex justify="center" py="9">
          <Spinner size="3" />
        </Flex>
      }
    >
      <PaymentReturnContent />
    </Suspense>
  );
}
