import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Route cần đăng nhập
const PROTECTED_ROUTES = ['/profile', '/orders', '/cart', '/checkout'];

// Route chỉ admin
const ADMIN_ROUTES = ['/admin'];

// Route auth (nếu đã login thì không cho vào)
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
    (PROTECTED_ROUTES.some((route) => pathname.startsWith(route)) ||
      ADMIN_ROUTES.some((route) => pathname.startsWith(route))) &&
    !isAuthenticated
  ) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 3. Vào /admin mà không phải admin → chặn (cần role)
  // Middleware không decode JWT dễ dàng nếu dùng secret khác.
  // → Nên check role ở server component hoặc API riêng.

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match tất cả request trừ:
     * - _next/static, _next/image (static files)
     * - favicon.ico
     * - public files (svg, png, jpg...)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
