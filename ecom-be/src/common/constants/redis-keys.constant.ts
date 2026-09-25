// src/common/constants/redis-keys.constant.ts
export const RedisKeys = {
  // OTP (existing)
  OTP: (email: string, purpose: string) => `otp:${purpose}:${email}`,
  OTP_ATTEMPTS: (email: string, purpose: string) =>
    `otp:attempts:${purpose}:${email}`,
  OTP_COOLDOWN: (email: string, purpose: string) =>
    `otp:cooldown:${purpose}:${email}`,

  // Session-per-device (NEW)
  SESSION: (userId: string, deviceId: string) =>
    `session:${userId}:${deviceId}`,
  USER_SESSIONS: (userId: string) => `sessions:${userId}`,
  SESSION_FAMILY: (familyId: string) => `family:${familyId}`,

  // Blacklist (NEW)
  ACCESS_BLACKLIST: (jti: string) => `blacklist:access:${jti}`,
};
export const OtpPurpose = {
  REGISTER: 'register',
  FORGOT_PASSWORD: 'forgot_password',
  LOGIN_2FA: 'login_2fa',
} as const;

export type OtpPurposeType = (typeof OtpPurpose)[keyof typeof OtpPurpose];
