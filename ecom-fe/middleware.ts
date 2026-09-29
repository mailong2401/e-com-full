// ecom-fe/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isAuthPath, isProtectedPath } from './lib/routes';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // accessToken sống 15 phút; csrfToken sống 7 ngày cùng phiên refresh.
  // → còn csrfToken nghĩa là có thể refresh được, KHÔNG được đá về /login.
  const hasAccessToken = !!request.cookies.get('accessToken')?.value;
  const hasSession =
    hasAccessToken || !!request.cookies.get('csrfToken')?.value;

  // Đã đăng nhập thật (còn access token) mà vào /login, /register → về trang chủ
  if (isAuthPath(pathname) && hasAccessToken) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Chưa có phiên mà vào trang cần đăng nhập → /login
  // (quyền admin được kiểm tra ở layout dashboard)
  if (isProtectedPath(pathname) && !hasSession) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
