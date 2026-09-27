// src/modules/payment/interfaces/payment-gateway.interface.ts
export interface CreatePaymentParams {
  orderId: string;
  amount: number;
  orderInfo: string;
  ipAddress: string;
  returnUrl: string;
}

export interface CreatePaymentResult {
  paymentUrl: string;
  providerTransactionId: string;
}

export interface WebhookVerifyResult {
  isValid: boolean;
  isSuccess: boolean;
  orderId: string;
  providerTransactionId: string;
  amount: number;
  responseCode: string;
  message: string;
  rawData: Record<string, any>;
}

export interface PaymentGateway {
  createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult>;
  verifyWebhook(data: Record<string, any>): WebhookVerifyResult;
  buildWebhookResponse(success: boolean, message: string): any;
}
