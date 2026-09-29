'use client'
import type { Metadata } from "next";
import '@radix-ui/themes/styles.css';
import { Theme } from '@radix-ui/themes';
import "./globals.css";
import { api } from '@/lib/api';
import { useEffect } from "react";


function AuthBootstrap({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Thử refresh một lần khi mount.
    // Nếu user chưa login → 401 → bỏ qua.
    api.post('/auth/refresh', {}, { withCredentials: true }).catch(() => {
      // chưa login hoặc refresh token hết hạn → không làm gì
    });
  }, []);

  return <>{children}</>;
}


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <Theme accentColor="teal" radius="full">
          <AuthBootstrap>{children}</AuthBootstrap>
        </Theme>
      </body>
    </html>
  );
}
