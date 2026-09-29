// ecom-fe/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Route cần đăng nhập
const PROTECTED_ROUTES = ['/profile', '/orders', '/cart', '/checkout', '/dashboard'];

// Route chỉ admin
const ADMIN_ROUTES = ['/dashboard'];

// Route auth (nếu đã login thì không cho vào)
const AUTH_ROUTES = ['/login', '/register', '/verify-otp'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Lưu ý: accessToken được lưu trong localStorage, không phải cookie.
  // Middleware không thể đọc localStorage.
  // => Giải pháp tạm thời: Dùng cookie để lưu accessToken (không khuyến khích vì bảo mật)
  // hoặc chấp nhận việc middleware không bảo vệ được và dựa vào client-side check trong layout.
  // Trong ví dụ này, tôi sẽ giả định accessToken được lưu trong cookie để middleware hoạt động.
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

  // 3. Vào /dashboard mà không phải admin → chặn (cần role)
  // Middleware không decode JWT dễ dàng nếu dùng secret khác.
  // → Nên check role ở server component hoặc API riêng.
  // Trong layout của dashboard, chúng ta đã check role.

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
