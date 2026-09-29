// ecom-fe/app/(client)/page.tsx
'use client';

import Link from 'next/link';
import {
  Box,
  Button,
  Card,
  Container,
  Flex,
  Grid,
  Heading,
  Text,
} from '@radix-ui/themes';
import { ArrowRightIcon, CubeIcon, LightningBoltIcon, StarIcon } from '@radix-ui/react-icons';
import { useAuth } from '@/hooks/useAuth';

const FEATURES = [
  {
    icon: <LightningBoltIcon width={24} height={24} />,
    title: 'Giao hàng nhanh',
    description: 'Nhận hàng trong 24h tại TP.HCM và Hà Nội.',
  },
  {
    icon: <StarIcon width={24} height={24} />,
    title: 'Chất lượng đảm bảo',
    description: 'Sản phẩm chính hãng, đổi trả trong 7 ngày.',
  },
  {
    icon: <CubeIcon width={24} height={24} />,
    title: 'Đa dạng sản phẩm',
    description: 'Hàng ngàn sản phẩm từ nhiều thương hiệu uy tín.',
  },
];

export default function ClientHomePage() {
  const { user, isAuthenticated } = useAuth();

  return (
    <Container size="4" px="4" py="8">
      {/* Hero */}
      <Box mb="8">
        <Flex direction="column" gap="4" align="center" style={{ textAlign: 'center' }}>
          <Heading size="8" weight="bold">
            {isAuthenticated ? `Chào mừng trở lại, ${user?.firstName}!` : 'Chào mừng đến E-Commerce'}
          </Heading>
          <Text size="4" color="gray" style={{ maxWidth: 600 }}>
            Khám phá hàng ngàn sản phẩm chất lượng với giá tốt nhất. Giao hàng tận nơi, đổi trả dễ dàng.
          </Text>
          <Flex gap="3" mt="2">
            <Link href="/products" style={{ textDecoration: 'none' }}>
              <Button size="3" variant="solid">
                Mua sắm ngay <ArrowRightIcon />
              </Button>
            </Link>
            {!isAuthenticated && (
              <Link href="/register" style={{ textDecoration: 'none' }}>
                <Button size="3" variant="soft">
                  Đăng ký thành viên
                </Button>
              </Link>
            )}
          </Flex>
        </Flex>
      </Box>

      {/* Features */}
      <Grid columns={{ initial: '1', md: '3' }} gap="5" mb="8">
        {FEATURES.map((f) => (
          <Card key={f.title} size="3">
            <Flex direction="column" gap="3">
              <Box
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  backgroundColor: 'var(--accent-a3)',
                  color: 'var(--accent-11)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {f.icon}
              </Box>
              <Heading size="4">{f.title}</Heading>
              <Text size="2" color="gray">
                {f.description}
              </Text>
            </Flex>
          </Card>
        ))}
      </Grid>

      {/* Products placeholder */}
      <Box>
        <Flex justify="between" align="center" mb="4">
          <Heading size="5">Sản phẩm nổi bật</Heading>
          <Link href="/products" style={{ textDecoration: 'none' }}>
            <Button variant="ghost" size="2">
              Xem tất cả <ArrowRightIcon />
            </Button>
          </Link>
        </Flex>
        <Card size="3" style={{ padding: '60px 20px' }}>
          <Flex direction="column" align="center" gap="2">
            <Text color="gray">Danh sách sản phẩm sẽ xuất hiện ở đây</Text>
            <Text size="1" color="gray">
              (Cần gọi API GET /api/products)
            </Text>
          </Flex>
        </Card>
      </Box>
    </Container>
  );
}
