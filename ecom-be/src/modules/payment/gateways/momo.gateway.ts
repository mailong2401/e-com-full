// src/modules/payment/gateways/momo.gateway.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { randomUUID } from 'crypto';
import {
  CreatePaymentParams,
  CreatePaymentResult,
  PaymentGateway,
  WebhookVerifyResult,
} from '../interfaces/payment-gateway.interface';

@Injectable()
export class MomoGateway implements PaymentGateway {
  private readonly logger = new Logger(MomoGateway.name);

  constructor(private readonly config: ConfigService) { }

  async createPayment(
    params: CreatePaymentParams,
  ): Promise<CreatePaymentResult> {
    const partnerCode = this.config.getOrThrow<string>('MOMO_PARTNER_CODE');
    const accessKey = this.config.getOrThrow<string>('MOMO_ACCESS_KEY');
    const secretKey = this.config.getOrThrow<string>('MOMO_SECRET_KEY');
    const endpoint = this.config.getOrThrow<string>('MOMO_ENDPOINT');
    const redirectUrl = this.config.getOrThrow<string>('MOMO_REDIRECT_URL');
    const ipnUrl = this.config.getOrThrow<string>('MOMO_IPN_URL');

    const requestId = randomUUID();
    const orderId = params.orderId;
    const amount = params.amount;
    const orderInfo = params.orderInfo;
    const requestType = 'payWithMethod';
    const extraData = '';

    const rawSignature =
      `accessKey=${accessKey}` +
      `&amount=${amount}` +
      `&extraData=${extraData}` +
      `&ipnUrl=${ipnUrl}` +
      `&orderId=${orderId}` +
      `&orderInfo=${orderInfo}` +
      `&partnerCode=${partnerCode}` +
      `&redirectUrl=${redirectUrl}` +
      `&requestId=${requestId}` +
      `&requestType=${requestType}`;

    const signature = createHmac('sha256', secretKey)
      .update(rawSignature)
      .digest('hex');

    const body = {
      partnerCode,
      partnerName: 'E-Commerce',
      storeId: 'ECommerceStore',
      requestId,
      amount,
      orderId,
      orderInfo,
      redirectUrl,
      ipnUrl,
      lang: 'vi',
      extraData,
      requestType,
      signature,
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const result = await response.json();

    if (result.resultCode !== 0) {
      throw new Error(`Momo create payment failed: ${result.message}`);
    }

    return {
      paymentUrl: result.payUrl,
      providerTransactionId: result.requestId,
    };
  }

  verifyWebhook(data: Record<string, any>): WebhookVerifyResult {
    const accessKey = this.config.getOrThrow<string>('MOMO_ACCESS_KEY');
    const secretKey = this.config.getOrThrow<string>('MOMO_SECRET_KEY');

    const rawSignature =
      `accessKey=${accessKey}` +
      `&amount=${data.amount}` +
      `&extraData=${data.extraData || ''}` +
      `&message=${data.message}` +
      `&orderId=${data.orderId}` +
      `&orderInfo=${data.orderInfo}` +
      `&orderType=${data.orderType}` +
      `&partnerCode=${data.partnerCode}` +
      `&payType=${data.payType}` +
      `&requestId=${data.requestId}` +
      `&responseTime=${data.responseTime}` +
      `&resultCode=${data.resultCode}` +
      `&transId=${data.transId}`;

    const signature = createHmac('sha256', secretKey)
      .update(rawSignature)
      .digest('hex');

    const isValid = signature === data.signature;
    const isSuccess = isValid && data.resultCode === 0;

    return {
      isValid,
      isSuccess,
      orderId: data.orderId,
      providerTransactionId: String(data.transId),
      amount: Number(data.amount),
      responseCode: String(data.resultCode),
      message: data.message || '',
      rawData: data,
    };
  }

  buildWebhookResponse(success: boolean, message: string): any {
    return { message };
  }
}
