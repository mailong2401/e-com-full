// src/modules/auth/dto/resend-otp.dto.ts
import { IsEmail, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';
import type { OtpPurposeType } from 'src/common/constants/redis-keys.constant';

export class ResendOtpDto {
  @IsEmail()
  @Transform(({ value }) => value?.toLowerCase().trim())
  email!: string;

  @IsIn(['register', 'forgot_password', 'login_2fa'])
  purpose!: OtpPurposeType;
}
