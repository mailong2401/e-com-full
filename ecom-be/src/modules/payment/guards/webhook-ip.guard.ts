// src/modules/payment/guards/webhook-ip.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WebhookIpGuard implements CanActivate {
  private readonly logger = new Logger(WebhookIpGuard.name);
  private readonly allowedIps: Record<string, string[]>;

  constructor(private readonly config: ConfigService) {
    this.allowedIps = {
      vnpay: (this.config.get('VNPAY_WHITELIST_IPS') || '')
        .split(',')
        .filter(Boolean),
      momo: (this.config.get('MOMO_WHITELIST_IPS') || '')
        .split(',')
        .filter(Boolean),
    };
  }

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    // ✅ Đọc provider từ URL path thay vì req.params
    const provider = this.extractProvider(req.path);
    const ip = this.normalizeIp(req.ip);

    const whitelist = this.allowedIps[provider];
    if (!whitelist || whitelist.length === 0) {
      // Không cấu hình whitelist → bỏ qua (dựa vào signature)
      return true;
    }

    if (!whitelist.includes(ip)) {
      this.logger.warn(
        `🚫 Webhook from unauthorized IP: ${ip} (provider=${provider})`,
      );
      throw new ForbiddenException('IP not allowed');
    }

    return true;
  }

  /**
   * Trích provider từ path: /api/payments/vnpay/webhook → 'vnpay'
   */
  private extractProvider(path: string): string {
    const parts = path.split('/').filter(Boolean);
    // ['api', 'payments', 'vnpay', 'webhook']
    const idx = parts.indexOf('payments');
    return idx !== -1 && parts[idx + 1] ? parts[idx + 1] : '';
  }

  private normalizeIp(ip: string): string {
    return ip.replace(/^::ffff:/, '');
  }
}
