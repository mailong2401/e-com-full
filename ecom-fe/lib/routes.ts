// ecom-fe/lib/routes.ts
export const PROTECTED_ROUTES = ['/profile', '/orders', '/cart', '/checkout'];
export const ADMIN_ROUTES = ['/dashboard'];
export const AUTH_ROUTES = ['/login', '/register', '/verify-otp'];

const matches = (pathname: string, routes: string[]) =>
  routes.some((r) => pathname === r || pathname.startsWith(r + '/'));

export const isProtectedPath = (pathname: string) =>
  matches(pathname, PROTECTED_ROUTES) || matches(pathname, ADMIN_ROUTES);

export const isAuthPath = (pathname: string) => matches(pathname, AUTH_ROUTES);

/** Chỉ cho phép redirect nội bộ (chống open redirect) */
export const safeRedirect = (value: string | null | undefined): string | null =>
  value && value.startsWith('/') && !value.startsWith('//') ? value : null;
