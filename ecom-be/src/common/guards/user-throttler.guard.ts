// src/common/guards/user-throttler.guard.ts
import {
  Injectable,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ThrottlerGuard, ThrottlerLimitDetail } from '@nestjs/throttler';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected readonly logger = new Logger(UserThrottlerGuard.name);

  protected async getTracker(req: Record<string, any>): Promise<string> {
    const authHeader = req.headers?.authorization;

    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.slice(7);
        const decoded = jwt.decode(token) as {
          sub?: string;
          role?: string;
        } | null;

        if (decoded?.role === 'admin' && decoded.sub) {
          return `admin:${decoded.sub}`;
        }
        if (decoded?.sub) {
          return `user:${decoded.sub}`;
        }
      } catch { }
    }

    return `ip:${req.ip}`;
  }

  protected async throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    const req = context.switchToHttp().getRequest();
    const ttlSeconds = Math.ceil(throttlerLimitDetail.timeToExpire / 1000);

    this.logger.warn(
      `🚫 Rate limit exceeded: ${req.method} ${req.url} (retry after ${ttlSeconds}s)`,
    );

    throw new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: `Quá nhiều yêu cầu. Vui lòng thử lại sau ${ttlSeconds} giây.`,
        retryAfter: ttlSeconds,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
