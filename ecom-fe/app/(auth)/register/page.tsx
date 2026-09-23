'use client'
import { Box, Card, Flex, Heading, Text, TextField, Button } from "@radix-ui/themes";
import { useState } from "react";
import { User, Mail, Phone, Lock } from "lucide-react";

export default function RegisterPage() {
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log({ firstname, lastname, username, email, phone, password });
    // Gói dữ liệu này để gửi sang API NestJS của bạn
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

              {/* Họ và Tên */}
              <Flex direction="row" gap="3">
                <Box style={{ flex: 1 }}>
                  <Text as="label" size="2" weight="bold" mb="1">
                    First Name
                  </Text>
                  <TextField.Root
                    placeholder="First name..."
                    value={firstname}
                    onChange={(e) => setFirstname(e.target.value)}
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
                  >
                    <TextField.Slot>
                      <User height="16" width="16" />
                    </TextField.Slot>
                  </TextField.Root>
                </Box>
              </Flex>

              {/* Username */}
              <Box>
                <Text as="label" size="2" weight="bold" mb="1">
                  Username
                </Text>
                <TextField.Root
                  placeholder="Username..."
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                >
                  <TextField.Slot>
                    <User height="16" width="16" />
                  </TextField.Slot>
                </TextField.Root>
              </Box>

              {/* Email */}
              <Box>
                <Text as="label" size="2" weight="bold" mb="1" >
                  Email
                </Text>
                <TextField.Root
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                >
                  <TextField.Slot>
                    <Mail height="16" width="16" />
                  </TextField.Slot>
                </TextField.Root>
              </Box>

              {/* Phone */}
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

              {/* Password */}
              <Box>
                <Text as="label" size="2" weight="bold" mb="1">
                  Password
                </Text>
                <TextField.Root
                  type="password"
                  placeholder="Password..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                >
                  <TextField.Slot>
                    <Lock height="16" width="16" />
                  </TextField.Slot>
                </TextField.Root>
              </Box>

              {/* Nút Submit */}
              <Button size="3" variant="solid" type="submit" style={{ width: '100%', marginTop: '12px', cursor: 'pointer' }}>
                Đăng ký
              </Button>

            </Flex>
          </form>
        </Card>
      </Box>
    </Flex>
  );
}
