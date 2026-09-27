// src/modules/payment/payment.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentTransaction } from './entities/payment-transaction.entity';
import { Cart } from '../cart/cart.entity';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { VnpayGateway } from './gateways/vnpay.gateway';
import { MomoGateway } from './gateways/momo.gateway';
import { WebhookIpGuard } from './guards/webhook-ip.guard';

@Module({
  imports: [TypeOrmModule.forFeature([PaymentTransaction, Cart])],
  providers: [PaymentService, VnpayGateway, MomoGateway, WebhookIpGuard],
  controllers: [PaymentController],
  exports: [PaymentService],
})
export class PaymentModule { }
