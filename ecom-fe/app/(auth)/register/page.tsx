'use client'
import { Box, Card, Flex, Heading, Text, TextField, Button, Callout } from "@radix-ui/themes";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Mail, Phone, Lock } from "lucide-react";
import { authService } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await authService.register({
        firstName: firstname,
        lastName: lastname,
        username,
        email,
        phone: phone || undefined,
        password,
      });

      // Lưu email để trang verify dùng
      sessionStorage.setItem('pendingEmail', email);
      router.push('/verify-otp?purpose=register');
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Flex
      align="center"
      justify="center"
      style={{ minHeight: '100vh', backgroundColor: 'var(--gray-2)', padding: '24px 0' }}
    >
      <Box width="100%" maxWidth="480px" p="4">
        <Flex direction="column" align="center" mb="4">
          <Heading size="6" weight="bold" mb="1">
            Tạo tài khoản mới
          </Heading>
          <Text size="2" color="gray">
            Đăng ký để bắt đầu quản lý hệ thống của bạn
          </Text>
        </Flex>

        <Card size="4">
          <form onSubmit={handleSubmit}>
            <Flex direction="column" gap="3">
              {error && (
                <Callout.Root color="red" size="1">
                  <Callout.Text>{error}</Callout.Text>
                </Callout.Root>
              )}

              <Flex direction="row" gap="3">
                <Box style={{ flex: 1 }}>
                  <Text as="label" size="2" weight="bold" mb="1">
                    First Name
                  </Text>
                  <TextField.Root
                    placeholder="First name..."
                    value={firstname}
                    onChange={(e) => setFirstname(e.target.value)}
                    required
                  >
                    <TextField.Slot>
                      <User height="16" width="16" />
                    </TextField.Slot>
                  </TextField.Root>
                </Box>

                <Box style={{ flex: 1 }}>
                  <Text as="label" size="2" weight="bold" mb="1">
                    Last Name
                  </Text>
                  <TextField.Root
                    placeholder="Last name..."
                    value={lastname}
                    onChange={(e) => setLastname(e.target.value)}
                    required
                  >
                    <TextField.Slot>
                      <User height="16" width="16" />
                    </TextField.Slot>
                  </TextField.Root>
                </Box>
              </Flex>

              <Box>
                <Text as="label" size="2" weight="bold" mb="1">
                  Username
                </Text>
                <TextField.Root
                  placeholder="Username..."
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                >
                  <TextField.Slot>
                    <User height="16" width="16" />
                  </TextField.Slot>
                </TextField.Root>
              </Box>

              <Box>
                <Text as="label" size="2" weight="bold" mb="1">
                  Email
                </Text>
                <TextField.Root
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                >
                  <TextField.Slot>
                    <Mail height="16" width="16" />
                  </TextField.Slot>
                </TextField.Root>
              </Box>

              <Box>
                <Text as="label" size="2" weight="bold" mb="1">
                  Phone
                </Text>
                <TextField.Root
                  type="tel"
                  placeholder="Phone number..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                >
                  <TextField.Slot>
                    <Phone height="16" width="16" />
                  </TextField.Slot>
                </TextField.Root>
              </Box>

              <Box>
                <Text as="label" size="2" weight="bold" mb="1">
                  Password
                </Text>
                <TextField.Root
                  type="password"
                  placeholder="Password (6+ ký tự, có chữ và số)..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                >
                  <TextField.Slot>
                    <Lock height="16" width="16" />
                  </TextField.Slot>
                </TextField.Root>
              </Box>

              <Button
                size="3"
                variant="solid"
                type="submit"
                disabled={loading}
                style={{ width: '100%', marginTop: '12px', cursor: 'pointer' }}
              >
                {loading ? 'Đang xử lý...' : 'Đăng ký'}
              </Button>

              <Text size="2" color="gray" align="center">
                Đã có tài khoản?{' '}
                <a href="/login" style={{ fontWeight: 'bold', color: 'var(--accent-9)' }}>
                  Đăng nhập
                </a>
              </Text>
            </Flex>
          </form>
        </Card>
      </Box>
    </Flex>
  );
}
