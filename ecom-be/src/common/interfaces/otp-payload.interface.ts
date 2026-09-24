// src/common/interfaces/otp-payload.interface.ts
import { OtpPurposeType } from '../constants/redis-keys.constant';

export interface OtpPayload {
  email: string;
  otp: string;
  purpose: OtpPurposeType;
  createdAt: number;
}
