// ecom-fe/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_ROUTES = ['/profile', '/orders', '/cart', '/checkout'];
const ADMIN_ROUTES = ['/dashboard'];
const AUTH_ROUTES = ['/login', '/register', '/verify-otp'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get('accessToken')?.value;
  const isAuthenticated = !!accessToken;

  // 1. Đã login mà vào /login, /register → chuyển về trang chủ
  if (AUTH_ROUTES.some((route) => pathname.startsWith(route)) && isAuthenticated) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // 2. Chưa login mà vào route protected → chuyển về /login (kèm redirect)
  if (
    PROTECTED_ROUTES.some((route) => pathname.startsWith(route)) &&
    !isAuthenticated
  ) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 3. Vào /dashboard mà chưa login → chuyển về /login
  // (role admin sẽ được check ở layout dashboard vì middleware không đọc được JWT role)
  if (ADMIN_ROUTES.some((route) => pathname.startsWith(route)) && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
