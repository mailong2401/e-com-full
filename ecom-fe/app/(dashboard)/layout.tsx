// ecom-fe/app/(dashboard)/layout.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Box,
  Flex,
  Heading,
  Text,
  Button,
  Avatar,
  DropdownMenu,
  Separator,
} from '@radix-ui/themes';
import {
  HomeIcon,
  CubeIcon,
  PersonIcon,
  ExitIcon,
  HamburgerMenuIcon,
} from '@radix-ui/react-icons';
import { authService, User } from '@/lib/auth';

const navItems = [
  { href: '/dashboard', label: 'Tổng quan', icon: <HomeIcon /> },
  { href: '/dashboard/products', label: 'Sản phẩm', icon: <CubeIcon /> },
  { href: '/dashboard/users', label: 'Người dùng', icon: <PersonIcon /> },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const profile = await authService.getProfile();
        if (profile.role !== 'admin') {
          router.push('/');
          return;
        }
        setUser(profile);
      } catch (error) {
        // 401 → interceptor đã thử refresh, vẫn fail → chuyển login
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    const handleLogout = async () => {
      try {
        await authService.logout();
      } catch {
        // dù lỗi vẫn chuyển về login
      }
      router.push('/login');
    };

    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    await authService.logout();
    router.push('/login');
  };

  if (loading) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: '100vh' }}>
        <Text>Đang tải...</Text>
      </Flex>
    );
  }

  if (!user) {
    return null; // Sẽ được chuyển hướng bởi useEffect
  }

  return (
    <Flex style={{ minHeight: '100vh' }}>
      {/* Sidebar */}
      <Box
        style={{
          width: isSidebarOpen ? '250px' : '60px',
          backgroundColor: 'var(--gray-3)',
          transition: 'width 0.3s ease',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <Flex align="center" justify="between">
          <Heading
            size="5"
            style={{
              opacity: isSidebarOpen ? 1 : 0,
              transition: 'opacity 0.2s',
            }}
          >
            E-Commerce
          </Heading>
          <Button
            variant="ghost"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            <HamburgerMenuIcon />
          </Button>
        </Flex>
        <Separator size="4" />
        <Flex direction="column" gap="2">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} passHref>
              <Button
                variant={pathname === item.href ? 'solid' : 'ghost'}
                style={{
                  width: '100%',
                  justifyContent: 'flex-start',
                  padding: '10px',
                }}
              >
                {item.icon}
                {isSidebarOpen && <Text ml="2">{item.label}</Text>}
              </Button>
            </Link>
          ))}
        </Flex>
      </Box>

      {/* Main Content */}
      <Flex direction="column" style={{ flex: 1 }}>
        {/* Header */}
        <Flex
          align="center"
          justify="between"
          p="4"
          style={{ borderBottom: '1px solid var(--gray-4)' }}
        >
          <Heading size="4">Dashboard</Heading>
          <Flex align="center" gap="3">
            <Text size="2">{user.firstName} {user.lastName}</Text>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger>
                <Button variant="soft">
                  <Avatar
                    size="2"
                    src={user.avatar ?? undefined}
                    fallback={user.firstName.charAt(0)}
                    radius="full"
                  />
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content>
                <DropdownMenu.Item onSelect={() => router.push('/profile')}>
                  Hồ sơ
                </DropdownMenu.Item>
                <DropdownMenu.Separator />
                <DropdownMenu.Item color="red" onSelect={handleLogout}>
                  <ExitIcon /> Đăng xuất
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          </Flex>
        </Flex>

        {/* Page Content */}
        <Box p="6" style={{ flex: 1, backgroundColor: 'var(--gray-1)' }}>
          {children}
        </Box>
      </Flex>
    </Flex>
  );
}
