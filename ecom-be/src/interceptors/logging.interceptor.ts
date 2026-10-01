// logging.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const start = Date.now();
    const req = context.switchToHttp().getRequest();
    const { method, url, ip, headers } = req;
    const userAgent = headers['user-agent'] || 'unknown';

    // Log request
    this.logger.log(`📥 [REQUEST] ${method} ${url} - ${ip} - ${userAgent}`);

    return next.handle().pipe(
      tap({
        next: (data) => {
          const responseTime = Date.now() - start;
          const res = context.switchToHttp().getResponse();

          // Log response thành công
          this.logger.log(
            `📤 [RESPONSE] ${method} ${url} - ${res.statusCode} - ${responseTime}ms`,
          );

          // Log chi tiết response (nếu cần)
          if (process.env.NODE_ENV === 'development') {
            this.logger.debug(
              `📦 Response data: ${JSON.stringify(data).substring(0, 200)}`,
            );
          }
        },
        error: (error) => {
          const responseTime = Date.now() - start;

          // Log lỗi
          this.logger.error(
            `❌ [ERROR] ${method} ${url} - ${error.status || 500} - ${responseTime}ms - ${error.message}`,
          );
          this.logger.error(`Stack: ${error.stack}`);
        },
      }),
    );
  }
}
