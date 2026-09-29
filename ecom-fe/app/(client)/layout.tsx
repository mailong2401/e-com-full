// ecom-fe/app/(client)/layout.tsx
'use client';

import { Box, Flex, Text, Container } from '@radix-ui/themes';
import { ClientHeader } from '@/components/client-header';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Flex direction="column" style={{ minHeight: '100vh' }}>
      <ClientHeader />

      <Box
        asChild
        style={{
          flex: 1,
          backgroundColor: 'var(--gray-1)',
        }}
      >
        <main>{children}</main>
      </Box>

      {/* Footer */}
      <Box
        style={{
          borderTop: '1px solid var(--gray-4)',
          backgroundColor: 'var(--gray-2)',
        }}
        py="5"
      >
        <Container size="4" px="4">
          <Flex direction="column" gap="3" align="center">
            <Text size="2" color="gray">
              © {new Date().getFullYear()} E-Commerce. All rights reserved.
            </Text>
            <Flex gap="4">
              <Text size="2" color="gray">
                Điều khoản
              </Text>
              <Text size="2" color="gray">
                Bảo mật
              </Text>
              <Text size="2" color="gray">
                Liên hệ
              </Text>
            </Flex>
          </Flex>
        </Container>
      </Box>
    </Flex>
  );
}
