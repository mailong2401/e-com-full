// src/modules/payment/dto/create-payment.dto.ts
import { IsEnum, IsNotEmpty, IsUUID } from 'class-validator';
import { PaymentProvider } from '../constants/payment.constant';

export class CreatePaymentDto {
  @IsUUID()
  @IsNotEmpty()
  cartId!: string;

  @IsEnum(PaymentProvider)
  @IsNotEmpty()
  provider!: PaymentProvider;
}
