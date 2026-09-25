// src/modules/auth/services/otp.service.ts
import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomInt, randomBytes } from 'crypto';
import { RedisService } from 'src/infrastructure/redis/redis.service';
import { MailService } from 'src/infrastructure/mail/mail.service';
import { TooManyRequestsException } from 'src/common/exceptions/too-many-requests.exception';
import {
  RedisKeys,
  OtpPurposeType,
} from 'src/common/constants/redis-keys.constant';
import { OtpPayload } from 'src/common/interfaces/otp-payload.interface';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  private readonly OTP_LENGTH: number;
  private readonly OTP_TTL: number; // seconds
  private readonly MAX_ATTEMPTS: number;
  private readonly RESEND_COOLDOWN: number; // seconds

  constructor(
    private readonly redis: RedisService,
    private readonly mailService: MailService,
    private readonly config: ConfigService,
  ) {
    this.OTP_LENGTH = this.config.get<number>('OTP_LENGTH', 6);
    this.OTP_TTL = this.config.get<number>('OTP_TTL_SECONDS', 300); // 5 phút
    this.MAX_ATTEMPTS = this.config.get<number>('OTP_MAX_ATTEMPTS', 5);
    this.RESEND_COOLDOWN = this.config.get<number>('OTP_RESEND_COOLDOWN', 60);
  }

  /**
   * Sinh OTP an toàn bằng crypto.randomInt
   */
  private generateOtp(): string {
    const min = Math.pow(10, this.OTP_LENGTH - 1);
    const max = Math.pow(10, this.OTP_LENGTH) - 1;
    return randomInt(min, max + 1).toString();
  }

  /**
   * Gửi OTP - có cooldown chống spam
   */
  async sendOtp(email: string, purpose: OtpPurposeType): Promise<void> {
    const cooldownKey = RedisKeys.OTP_COOLDOWN(email, purpose);
    const isCooldown = await this.redis.exists(cooldownKey);
    if (isCooldown) {
      const ttl = await this.redis.ttl(cooldownKey);
      throw new TooManyRequestsException(
        `Vui lòng đợi ${ttl} giây trước khi yêu cầu mã mới`,
      );
    }

    const otp = this.generateOtp();
    const payload: OtpPayload = {
      email,
      otp,
      purpose,
      createdAt: Date.now(),
    };

    // Lưu OTP vào Redis với TTL
    await this.redis.setJson(
      RedisKeys.OTP(email, purpose),
      payload,
      this.OTP_TTL,
    );

    // Reset attempts counter
    await this.redis.del(RedisKeys.OTP_ATTEMPTS(email, purpose));

    // Set cooldown
    await this.redis.set(cooldownKey, '1', this.RESEND_COOLDOWN);

    // Gửi mail (không block nếu fail — có thể đẩy vào queue production)
    await this.mailService.sendOtpEmail(
      email,
      otp,
      purpose,
      Math.floor(this.OTP_TTL / 60),
    );
  }

  /**
   * Verify OTP — chống brute force bằng attempts counter
   */
  async verifyOtp(
    email: string,
    otp: string,
    purpose: OtpPurposeType,
  ): Promise<boolean> {
    const otpKey = RedisKeys.OTP(email, purpose);
    const attemptsKey = RedisKeys.OTP_ATTEMPTS(email, purpose);

    const attempts = await this.redis.incrWithTtl(attemptsKey, this.OTP_TTL);
    if (attempts > this.MAX_ATTEMPTS) {
      // Xóa OTP để buộc user yêu cầu mã mới
      await this.redis.del(otpKey);
      throw new BadRequestException(
        'Bạn đã nhập sai quá nhiều lần. Vui lòng yêu cầu mã mới.',
      );
    }

    const payload = await this.redis.getJson<OtpPayload>(otpKey);
    if (!payload) {
      throw new BadRequestException('Mã OTP đã hết hạn hoặc không tồn tại');
    }

    if (payload.otp !== otp) {
      const remaining = this.MAX_ATTEMPTS - attempts;
      throw new BadRequestException(
        `Mã OTP không đúng. Còn ${remaining} lần thử.`,
      );
    }

    // Thành công → xóa OTP & attempts
    await this.redis.del(otpKey, attemptsKey);
    return true;
  }
}
