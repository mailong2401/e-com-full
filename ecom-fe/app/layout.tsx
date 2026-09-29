// ecom-fe/app/layout.tsx
import type { Metadata } from "next";
import '@radix-ui/themes/styles.css';
import { Theme } from '@radix-ui/themes';
import "./globals.css";

export const metadata: Metadata = {
  title: "E-Commerce",
  description: "Hệ thống thương mại điện tử",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <Theme accentColor="teal" radius="full">
          {children}
        </Theme>
      </body>
    </html>
  );
}
