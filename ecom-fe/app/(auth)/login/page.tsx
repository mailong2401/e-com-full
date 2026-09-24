'use client'
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Card,
  Flex,
  Heading,
  Text,
  TextField,
  Button,
  Link,
  Checkbox,
  Callout,
} from '@radix-ui/themes';
import { EnvelopeClosedIcon, LockClosedIcon } from '@radix-ui/react-icons';
import { authService } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { tokens, user } = await authService.login({ email, password });
      authService.saveTokens(tokens);

      // Redirect theo role
      router.push(user.role === 'admin' ? '/admin' : '/');
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
        'Email hoặc mật khẩu không đúng. Vui lòng thử lại.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Flex
      align="center"
      justify="center"
      style={{ minHeight: '100vh', backgroundColor: 'var(--gray-2)' }}
    >
      <Box width="100%" maxWidth="400px" p="4">
        <Flex direction="column" align="center" mb="5">
          <Heading size="6" weight="bold" mb="1">
            Chào mừng trở lại!
          </Heading>
          <Text size="2" color="gray">
            Đăng nhập vào hệ thống quản lý của bạn
          </Text>
        </Flex>

        <Card size="4">
          <form onSubmit={handleSubmit}>
            <Flex direction="column" gap="4">
              {error && (
                <Callout.Root color="red" size="1">
                  <Callout.Text>{error}</Callout.Text>
                </Callout.Root>
              )}

              {/* Email */}
              <Box>
                <Text as="label" size="2" weight="bold" mb="1">
                  Email
                </Text>
                <TextField.Root
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  size="3"
                  required
                >
                  <TextField.Slot>
                    <EnvelopeClosedIcon height="16" width="16" />
                  </TextField.Slot>
                </TextField.Root>
              </Box>

              {/* Password */}
              <Box>
                <Flex justify="between" align="center" mb="1">
                  <Text as="label" size="2" weight="bold">
                    Mật khẩu
                  </Text>
                  <Link href="#" size="2">
                    Quên mật khẩu?
                  </Link>
                </Flex>
                <TextField.Root
                  type="password"
                  placeholder="Nhập mật khẩu của bạn"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  size="3"
                  required
                >
                  <TextField.Slot>
                    <LockClosedIcon height="16" width="16" />
                  </TextField.Slot>
                </TextField.Root>
              </Box>

              <Flex align="center" gap="2">
                <Checkbox defaultChecked />
                <Text size="2">Ghi nhớ đăng nhập</Text>
              </Flex>

              <Button
                size="3"
                variant="solid"
                type="submit"
                disabled={loading}
                style={{ width: '100%', cursor: 'pointer' }}
              >
                {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </Button>

              <Button
                size="3"
                variant="outline"
                type="button"
                onClick={() => router.push('/register')}
                style={{ cursor: 'pointer' }}
              >
                Đăng ký
              </Button>
            </Flex>
          </form>
        </Card>

        <Flex justify="center" mt="4" gap="1">
          <Text size="2" color="gray">Chưa có tài khoản?</Text>
          <Link href="/register" size="2" weight="bold">Đăng ký ngay</Link>
        </Flex>
      </Box>
    </Flex>
  );
}
