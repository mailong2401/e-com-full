// src/modules/payment/constants/payment.constant.ts
export enum PaymentProvider {
  VNPAY = 'vnpay',
  MOMO = 'momo',
  COD = 'cod',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
}

export enum CartPaymentStatus {
  UNPAID = 'unpaid',
  PAID = 'paid',
  REFUNDED = 'refunded',
}

export const PAYMENT_CACHE_TTL = 300; // 5 phút
export const WEBHOOK_IDEMPOTENCY_TTL = 7 * 24 * 60 * 60; // 7 ngày
