// ecom-fe/components/client-header.tsx
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  Flex,
  Box,
  Heading,
  Text,
  Button,
  Avatar,
  DropdownMenu,
  Badge,
} from '@radix-ui/themes';
import {
  HomeIcon,
  CubeIcon,
  PersonIcon,
  ExitIcon,
  HamburgerMenuIcon,
  Cross1Icon,
  DashboardIcon,
} from '@radix-ui/react-icons';
import { CiShoppingCart } from "react-icons/ci";
import { useAuth } from '@/hooks/useAuth';

const NAV_ITEMS = [
  { href: '/', label: 'Trang chủ', icon: <HomeIcon /> },
  { href: '/products', label: 'Sản phẩm', icon: <CubeIcon /> },
  { href: '/orders', label: 'Đơn hàng', icon: <CubeIcon /> },
  { href: '/about', label: 'Giới thiệu', icon: <PersonIcon /> },
];

export function ClientHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
      await logout();
    }
  };

  return (
    <Box
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backgroundColor: 'var(--color-background)',
        borderBottom: '1px solid var(--gray-4)',
      }}
    >
      <Flex
        align="center"
        justify="between"
        px={{ initial: '4', md: '6' }}
        py="3"
        style={{ maxWidth: '1280px', margin: '0 auto', width: '100%' }}
      >
        {/* Logo */}
        <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          <Flex align="center" gap="2">
            <Box
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: 'var(--accent-9)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold',
              }}
            >
              E
            </Box>
            <Heading size="5">E-Commerce</Heading>
          </Flex>
        </Link>

        {/* Desktop nav */}
        <Flex
          align="center"
          gap="4"
          display={{ initial: 'none', md: 'flex' }}
        >
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{ textDecoration: 'none' }}
            >
              <Button
                variant={pathname === item.href ? 'solid' : 'ghost'}
                size="2"
              >
                {item.label}
              </Button>
            </Link>
          ))}
        </Flex>

        {/* Right actions */}
        <Flex align="center" gap="3">
          {/* Cart button */}
          <Button variant="soft" size="2">
            <CiShoppingCart /> Giỏ hàng
          </Button>

          {/* User area */}
          {loading ? (
            <Box style={{ width: 100, height: 32 }} />
          ) : isAuthenticated && user ? (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger>
                <Button variant="soft" size="2">
                  <Avatar
                    size="1"
                    src={user.avatar ?? undefined}
                    fallback={user.firstName.charAt(0)}
                    radius="full"
                  />
                  <Text size="2">
                    {user.firstName} {user.lastName}
                  </Text>
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content>
                <DropdownMenu.Label>
                  <Flex direction="column" gap="1">
                    <Text size="2" weight="bold">
                      {user.firstName} {user.lastName}
                    </Text>
                    <Text size="1" color="gray">
                      {user.email}
                    </Text>
                    {user.role === 'admin' && (
                      <Badge color="red" size="1">
                        Admin
                      </Badge>
                    )}
                  </Flex>
                </DropdownMenu.Label>
                <DropdownMenu.Separator />

                <DropdownMenu.Item
                  onSelect={() => router.push('/profile')}
                >
                  <PersonIcon /> Hồ sơ
                </DropdownMenu.Item>

                <DropdownMenu.Item
                  onSelect={() => router.push('/orders')}
                >
                  <CubeIcon /> Đơn hàng
                </DropdownMenu.Item>

                {user.role === 'admin' && (
                  <>
                    <DropdownMenu.Separator />
                    <DropdownMenu.Item
                      onSelect={() => router.push('/dashboard')}
                    >
                      <DashboardIcon /> Trang quản trị
                    </DropdownMenu.Item>
                  </>
                )}

                <DropdownMenu.Separator />
                <DropdownMenu.Item color="red" onSelect={handleLogout}>
                  <ExitIcon /> Đăng xuất
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          ) : (
            <Flex align="center" gap="2">
              <Link href="/login" style={{ textDecoration: 'none' }}>
                <Button variant="soft" size="2">
                  Đăng nhập
                </Button>
              </Link>
              <Link href="/register" style={{ textDecoration: 'none' }}>
                <Button variant="solid" size="2">
                  Đăng ký
                </Button>
              </Link>
            </Flex>
          )}

          {/* Mobile menu toggle */}
          <Button
            variant="ghost"
            size="2"
            display={{ initial: 'flex', md: 'none' }}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <Cross1Icon /> : <HamburgerMenuIcon />}
          </Button>
        </Flex>
      </Flex>

      {/* Mobile nav */}
      {mobileOpen && (
        <Box
          display={{ initial: 'block', md: 'none' }}
          p="4"
          style={{
            borderTop: '1px solid var(--gray-4)',
            backgroundColor: 'var(--gray-2)',
          }}
        >
          <Flex direction="column" gap="2">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{ textDecoration: 'none' }}
                onClick={() => setMobileOpen(false)}
              >
                <Button
                  variant={pathname === item.href ? 'solid' : 'ghost'}
                  style={{ width: '100%', justifyContent: 'flex-start' }}
                >
                  {item.icon}
                  <Text ml="2">{item.label}</Text>
                </Button>
              </Link>
            ))}
          </Flex>
        </Box>
      )}
    </Box>
  );
}
