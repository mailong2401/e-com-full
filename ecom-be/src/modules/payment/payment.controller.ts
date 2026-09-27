// src/modules/payment/payment.controller.ts
import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Ip,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/modules/auth/decorators/current-user.decorator';
import { User } from '../user/user.entity';
import { PaymentProvider } from './constants/payment.constant';
import { WebhookIpGuard } from './guards/webhook-ip.guard';

@Controller('payments')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(private readonly paymentService: PaymentService) { }

  // ============================================================
  // CREATE PAYMENT
  // ============================================================
  @Post('create')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @HttpCode(HttpStatus.OK)
  async createPayment(
    @CurrentUser() user: User,
    @Body() dto: CreatePaymentDto,
    @Ip() ip: string,
  ) {
    return this.paymentService.createPayment(user.id, dto, ip);
  }

  // ============================================================
  // WEBHOOK
  // ============================================================
  @Get('vnpay/webhook')
  @UseGuards(WebhookIpGuard)
  @HttpCode(HttpStatus.OK)
  async vnpayWebhook(@Query() query: Record<string, any>, @Ip() ip: string) {
    this.logger.log(`VNPay webhook received from ${ip}`);
    return this.paymentService.handleWebhook(PaymentProvider.VNPAY, query, ip);
  }

  @Get('vnpay/return')
  @HttpCode(HttpStatus.OK)
  async vnpayReturn(
    @Query() query: Record<string, any>,
    @Ip() ip: string, // ✅ Dùng IP thật
  ) {
    return this.paymentService.handleWebhook(PaymentProvider.VNPAY, query, ip);
  }

  @Post('momo/webhook')
  @UseGuards(WebhookIpGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async momoWebhook(@Body() body: Record<string, any>, @Ip() ip: string) {
    this.logger.log(`Momo webhook received from ${ip}`);
    await this.paymentService.handleWebhook(PaymentProvider.MOMO, body, ip);
  }

  @Get('momo/return')
  @HttpCode(HttpStatus.OK)
  async momoReturn(@Query() query: Record<string, any>, @Ip() ip: string) {
    return this.paymentService.handleWebhook(PaymentProvider.MOMO, query, ip);
  }

  // ============================================================
  // QUERY
  // ============================================================
  @Get('transactions/:id')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  async getTransaction(@CurrentUser() user: User, @Param('id') id: string) {
    return this.paymentService.getTransaction(user.id, id);
  }

  @Get('carts/:cartId/transactions')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  async getCartTransactions(
    @CurrentUser() user: User,
    @Param('cartId') cartId: string,
  ) {
    return this.paymentService.getTransactionsByCart(user.id, cartId);
  }
}
