// src/common/constants/redis-keys.constant.ts
export const RedisKeys = {
  OTP: (email: string, purpose: string) => `otp:${purpose}:${email}`,
  OTP_ATTEMPTS: (email: string, purpose: string) =>
    `otp:attempts:${purpose}:${email}`,
  OTP_COOLDOWN: (email: string, purpose: string) =>
    `otp:cooldown:${purpose}:${email}`,
  REFRESH_TOKEN_BLACKLIST: (jti: string) => `blacklist:refresh:${jti}`,
} as const;

export const OtpPurpose = {
  REGISTER: 'register',
  FORGOT_PASSWORD: 'forgot_password',
  LOGIN_2FA: 'login_2fa',
} as const;

export type OtpPurposeType = (typeof OtpPurpose)[keyof typeof OtpPurpose];
