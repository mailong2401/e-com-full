// src/modules/auth/dto/verify-otp.dto.ts
import { IsEmail, IsString, Length, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import type { OtpPurposeType } from 'src/common/constants/redis-keys.constant';
import { IsIn } from 'class-validator';

export class VerifyOtpDto {
  @IsEmail()
  @Transform(({ value }) => value?.toLowerCase().trim())
  email!: string;

  @IsString()
  @Length(4, 8)
  @Matches(/^\d+$/, { message: 'OTP chỉ chứa chữ số' })
  otp!: string;

  @IsIn(['register', 'forgot_password', 'login_2fa'])
  purpose!: OtpPurposeType;
}
