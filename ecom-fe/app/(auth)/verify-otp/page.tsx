'use client'
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Box, Card, Flex, Heading, Text, TextField, Button, Callout } from '@radix-ui/themes';
import { authService } from '@/lib/auth';

function VerifyOtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const purpose = searchParams.get('purpose') || 'register';

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    const pending = sessionStorage.getItem('pendingEmail');
    if (pending) setEmail(pending);
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (purpose === 'register') {
        const { user, tokens } = await authService.verifyRegisterOtp(email, otp);
        authService.saveTokens(tokens);
        sessionStorage.removeItem('pendingEmail');
        router.push(user.role === 'admin' ? '/admin' : '/');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Xác thực thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await authService.resendOtp(email, purpose);
      setCooldown(60);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể gửi lại OTP');
    }
  };

  return (
    <Flex align="center" justify="center" style={{ minHeight: '100vh', backgroundColor: 'var(--gray-2)' }}>
      <Box width="100%" maxWidth="400px" p="4">
        <Card size="4">
          <Flex direction="column" gap="4">
            <Heading size="6" align="center">Xác thực OTP</Heading>
            <Text size="2" color="gray" align="center">
              Mã OTP đã được gửi đến <strong>{email}</strong>
            </Text>

            {error && (
              <Callout.Root color="red" size="1">
                <Callout.Text>{error}</Callout.Text>
              </Callout.Root>
            )}

            <form onSubmit={handleVerify}>
              <Flex direction="column" gap="4">
                <TextField.Root
                  placeholder="Nhập mã OTP 6 chữ số"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  size="3"
                  style={{ textAlign: 'center', fontSize: '24px', letterSpacing: '8px' }}
                  required
                />

                <Button
                  size="3"
                  type="submit"
                  disabled={loading || otp.length < 4}
                  style={{ cursor: 'pointer' }}
                >
                  {loading ? 'Đang xác thực...' : 'Xác thực'}
                </Button>
              </Flex>
            </form>

            <Button
              variant="ghost"
              onClick={handleResend}
              disabled={cooldown > 0}
              style={{ cursor: cooldown > 0 ? 'not-allowed' : 'pointer' }}
            >
              {cooldown > 0 ? `Gửi lại sau ${cooldown}s` : 'Gửi lại mã OTP'}
            </Button>
          </Flex>
        </Card>
      </Box>
    </Flex>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyOtpContent />
    </Suspense>
  );
}
