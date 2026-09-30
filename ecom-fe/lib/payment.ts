// ecom-fe/lib/payment.ts
import { api } from './api';

export type PaymentProvider = 'vnpay' | 'momo' | 'cod';

export interface CreatePaymentPayload {
  cartId: string;
  provider: PaymentProvider;
}

export interface CreatePaymentResult {
  paymentUrl: string;
  transactionId: string;
}

export const paymentService = {
  create: async (payload: CreatePaymentPayload): Promise<CreatePaymentResult> => {
    const { data } = await api.post<CreatePaymentResult>(
      '/payments/create',
      payload,
    );
    return data;
  },

  getTransaction: async (id: string) => {
    const { data } = await api.get(`/payments/transactions/${id}`);
    return data;
  },
};
