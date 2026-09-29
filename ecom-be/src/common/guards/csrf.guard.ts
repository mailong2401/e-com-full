// src/common/guards/csrf.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import type { Request } from 'express';

@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly logger = new Logger(CsrfGuard.name);

  // Các method an toàn → bỏ qua CSRF
  private readonly SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

  // Các route không cần CSRF (chưa login, chưa có cookie)
  private readonly EXEMPT_PATHS = [
    '/api/auth/login',
    '/api/auth/register/send-otp',
    '/api/auth/register/verify-otp',
    '/api/auth/otp/resend',
    '/api/auth/refresh',
    '/api/auth/logout', // logout chỉ cần access token
  ];

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();

    // 1. Method an toàn → bỏ qua
    if (this.SAFE_METHODS.includes(req.method)) {
      return true;
    }

    // 2. Route được exempt → bỏ qua
    if (this.EXEMPT_PATHS.some((p) => req.path.startsWith(p))) {
      return true;
    }

    // 3. Verify double-submit token
    const cookieToken = req.cookies?.['csrfToken'];
    const headerToken =
      req.headers['x-csrf-token'] ?? req.headers['x-xsrf-token'];

    if (!cookieToken || !headerToken) {
      this.logger.warn(
        `CSRF token missing: ${req.method} ${req.url} ` +
        `(cookie=${!!cookieToken}, header=${!!headerToken})`,
      );
      throw new ForbiddenException('CSRF token missing');
    }

    if (cookieToken !== headerToken) {
      this.logger.warn(`CSRF token mismatch: ${req.method} ${req.url}`);
      throw new ForbiddenException('CSRF token invalid');
    }

    return true;
  }
}
