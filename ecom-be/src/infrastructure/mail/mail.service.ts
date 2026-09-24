// src/infrastructure/mail/mail.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly mailerService: MailerService) { }

  async sendOtpEmail(
    to: string,
    otp: string,
    purpose: string,
    ttlMinutes = 5,
  ): Promise<void> {
    const subjectMap: Record<string, string> = {
      register: 'Xác thực tài khoản của bạn',
      forgot_password: 'Đặt lại mật khẩu',
      login_2fa: 'Mã xác thực đăng nhập',
    };

    try {
      await this.mailerService.sendMail({
        to,
        subject: subjectMap[purpose] ?? 'Mã xác thực OTP',
        template: 'otp-verification',
        context: {
          otp,
          purpose: subjectMap[purpose] ?? 'Xác thực',
          ttlMinutes,
          year: new Date().getFullYear(),
        },
      });
      this.logger.log(`OTP email sent to ${to} (purpose: ${purpose})`);
    } catch (error) {
      this.logger.error(`Failed to send OTP email to ${to}`, error);
      throw error;
    }
  }
}
