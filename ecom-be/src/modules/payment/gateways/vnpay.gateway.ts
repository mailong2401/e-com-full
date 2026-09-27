// src/modules/payment/gateways/vnpay.gateway.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import {
  CreatePaymentParams,
  CreatePaymentResult,
  PaymentGateway,
  WebhookVerifyResult,
} from '../interfaces/payment-gateway.interface';

@Injectable()
export class VnpayGateway implements PaymentGateway {
  private readonly logger = new Logger(VnpayGateway.name);

  constructor(private readonly config: ConfigService) { }

  async createPayment(
    params: CreatePaymentParams,
  ): Promise<CreatePaymentResult> {
    const vnp_TmnCode = this.config.getOrThrow<string>('VNPAY_TMN_CODE');
    const vnp_HashSecret = this.config.getOrThrow<string>('VNPAY_HASH_SECRET');
    const vnp_Url = this.config.getOrThrow<string>('VNPAY_URL');

    const date = new Date();
    const createDate = this.formatDate(date);
    const expireDate = this.formatDate(
      new Date(date.getTime() + 15 * 60 * 1000),
    );

    const vnp_Params: Record<string, string> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode,
      vnp_Locale: 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: params.orderId,
      vnp_OrderInfo: params.orderInfo,
      vnp_OrderType: 'other',
      vnp_Amount: String(Math.round(params.amount * 100)), // VNPay dùng đơn vị đồng * 100
      vnp_ReturnUrl: params.returnUrl,
      vnp_IpAddr: params.ipAddress,
      vnp_CreateDate: createDate,
      vnp_ExpireDate: expireDate,
    };

    // Sắp xếp params theo alphabet và tạo query string
    const sortedKeys = Object.keys(vnp_Params).sort();
    const signData = sortedKeys
      .map(
        (key) =>
          `${key}=${encodeURIComponent(vnp_Params[key]).replace(/%20/g, '+')}`,
      )
      .join('&');

    const hmac = createHmac('sha512', vnp_HashSecret);
    const secureHash = hmac
      .update(Buffer.from(signData, 'utf-8'))
      .digest('hex');

    const paymentUrl = `${vnp_Url}?${signData}&vnp_SecureHash=${secureHash}`;

    return {
      paymentUrl,
      providerTransactionId: params.orderId,
    };
  }

  verifyWebhook(data: Record<string, any>): WebhookVerifyResult {
    const vnp_HashSecret = this.config.getOrThrow<string>('VNPAY_HASH_SECRET');
    const secureHash = data['vnp_SecureHash'];

    if (!secureHash) {
      return this.invalidResult('Missing vnp_SecureHash');
    }

    // Copy params, remove hash fields
    const params = { ...data };
    delete params['vnp_SecureHash'];
    delete params['vnp_SecureHashType'];

    // Sort keys và build signData
    const sortedKeys = Object.keys(params).sort();
    const signData = sortedKeys
      .map(
        (key) =>
          `${key}=${encodeURIComponent(params[key]).replace(/%20/g, '+')}`,
      )
      .join('&');

    const hmac = createHmac('sha512', vnp_HashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    const isValid = secureHash === signed;
    const responseCode = data['vnp_ResponseCode'];
    const isSuccess = isValid && responseCode === '00';

    return {
      isValid,
      isSuccess,
      orderId: data['vnp_TxnRef'],
      providerTransactionId: data['vnp_TransactionNo'],
      amount: Number(data['vnp_Amount']) / 100,
      responseCode,
      message: data['vnp_Message'] || '',
      rawData: data,
    };
  }

  buildWebhookResponse(success: boolean, message: string): any {
    return {
      RspCode: success ? '00' : '99',
      Message: message,
    };
  }

  private invalidResult(message: string): WebhookVerifyResult {
    return {
      isValid: false,
      isSuccess: false,
      orderId: '',
      providerTransactionId: '',
      amount: 0,
      responseCode: '',
      message,
      rawData: {},
    };
  }

  private formatDate(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return (
      date.getFullYear() +
      pad(date.getMonth() + 1) +
      pad(date.getDate()) +
      pad(date.getHours()) +
      pad(date.getMinutes()) +
      pad(date.getSeconds())
    );
  }
}
