// ecom-fe/app/layout.tsx
import type { Metadata } from 'next';
import '@radix-ui/themes/styles.css';
import { Theme } from '@radix-ui/themes';
import './globals.css';
import { AuthProvider } from '@/hooks/useAuth';
import { ToastProvider } from '@/components/toast-provider';

export const metadata: Metadata = {
  title: 'E-Commerce',
  description: 'Hệ thống thương mại điện tử',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <Theme accentColor="teal" radius="medium">
          <AuthProvider>
            <ToastProvider>{children}</ToastProvider>
          </AuthProvider>
        </Theme>
      </body>
    </html>
  );
}
