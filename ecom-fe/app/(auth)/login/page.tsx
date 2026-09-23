'use client'
import React, { useState } from 'react';
import {
  Box,
  Card,
  Flex,
  Heading,
  Text,
  TextField,
  Button,
  Link,
  Checkbox
} from '@radix-ui/themes';
import { EnvelopeClosedIcon, LockClosedIcon } from '@radix-ui/react-icons';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log({ email, password });
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

              {/* Ô nhập Email */}
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
                >
                  <TextField.Slot>
                    <EnvelopeClosedIcon height="16" width="16" />
                  </TextField.Slot>
                </TextField.Root>
              </Box>

              {/* Ô nhập Mật khẩu */}
              <Box>
                <Flex justify="between" align="center" mb="1">
                  <Text as="label" size="2" weight="bold">
                    Mật khẩu
                  </Text>
                  <Link href="#" size="2">Quên mật khẩu?</Link>
                </Flex>
                <TextField.Root
                  type="password"
                  placeholder="Nhập mật khẩu của bạn"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  size="3"
                >
                  <TextField.Slot>
                    <LockClosedIcon height="16" width="16" />
                  </TextField.Slot>
                </TextField.Root>
              </Box>

              {/* Ghi nhớ đăng nhập */}
              <Flex align="center" gap="2">
                <Checkbox defaultChecked />
                <Text size="2">Ghi nhớ đăng nhập</Text>
              </Flex>

              {/* Nút Submit */}
              <Button size="3" variant="solid" type="submit" style={{ width: '100%', cursor: 'pointer' }}>
                Đăng nhập
              </Button>
              <Button size="3" type="submit" variant="outline" style={{ cursor: 'pointer' }}>
                Dang ky
              </Button>


            </Flex>
          </form>
        </Card>

        {/* Chân trang đăng ký */}
        <Flex justify="center" mt="4" gap="1">
          <Text size="2" color="gray">Chưa có tài khoản?</Text>
          <Link href="#" size="2" weight="bold">Đăng ký ngay</Link>
        </Flex>

      </Box>
    </Flex>
  );
}
