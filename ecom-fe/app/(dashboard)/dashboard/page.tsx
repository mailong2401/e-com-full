// ecom-fe/app/(dashboard)/dashboard/page.tsx
'use client';

import { Flex, Grid, Card, Heading, Text, Box } from '@radix-ui/themes';
import { CubeIcon, PersonIcon, BarChartIcon } from '@radix-ui/react-icons';

const stats = [
  { title: 'Tổng doanh thu', value: '150,000,000₫', icon: <BarChartIcon width={24} height={24} />, color: 'var(--green-9)' },
  { title: 'Đơn hàng', value: '1,234', icon: <BarChartIcon width={24} height={24} />, color: 'var(--blue-9)' },
  { title: 'Sản phẩm', value: '567', icon: <CubeIcon width={24} height={24} />, color: 'var(--orange-9)' },
  { title: 'Người dùng', value: '8,910', icon: <PersonIcon width={24} height={24} />, color: 'var(--purple-9)' },
];

export default function DashboardPage() {
  return (
    <Flex direction="column" gap="6">
      <Heading size="6">Tổng quan</Heading>
      <Grid columns={{ initial: '1', sm: '2', lg: '4' }} gap="5">
        {stats.map((stat) => (
          <Card key={stat.title} size="3">
            <Flex align="center" justify="between">
              <Flex direction="column" gap="1">
                <Text size="2" color="gray">{stat.title}</Text>
                <Heading size="6">{stat.value}</Heading>
              </Flex>
              <Box style={{ color: stat.color }}>
                {stat.icon}
              </Box>
            </Flex>
          </Card>
        ))}
      </Grid>

      {/* Placeholder for charts */}
      <Card size="3" style={{ height: '400px' }}>
        <Flex align="center" justify="center" style={{ height: '100%' }}>
          <Text color="gray">Biểu đồ doanh thu (sắp ra mắt)</Text>
        </Flex>
      </Card>
    </Flex>
  );
}
