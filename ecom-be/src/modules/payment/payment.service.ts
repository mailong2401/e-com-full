// src/modules/payment/payment.service.ts
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { RedisService } from 'src/infrastructure/redis/redis.service';
import { PaymentTransaction } from './entities/payment-transaction.entity';
import {
  PaymentProvider,
  PaymentStatus,
  WEBHOOK_IDEMPOTENCY_TTL,
} from './constants/payment.constant';
import { Cart, CartStatus, CartPaymentStatus } from '../cart/cart.entity';
import { VnpayGateway } from './gateways/vnpay.gateway';
import { MomoGateway } from './gateways/momo.gateway';
import { CreatePaymentDto } from './dto/create-payment.dto';
import type { PaymentGateway } from './interfaces/payment-gateway.interface';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly gateways: Map<PaymentProvider, PaymentGateway>;

  constructor(
    @InjectRepository(PaymentTransaction)
    private readonly paymentRepo: Repository<PaymentTransaction>,
    @InjectRepository(Cart) // ✅ Cart thay Order
    private readonly cartRepo: Repository<Cart>,
    private readonly vnpayGateway: VnpayGateway,
    private readonly momoGateway: MomoGateway,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
  ) {
    this.gateways = new Map<PaymentProvider, PaymentGateway>([
      [PaymentProvider.VNPAY, this.vnpayGateway],
      [PaymentProvider.MOMO, this.momoGateway],
    ]);
  }

  // ============================================================
  // CREATE PAYMENT
  // ============================================================
  async createPayment(
    userId: string,
    dto: CreatePaymentDto,
    ipAddress: string,
  ): Promise<{ paymentUrl: string; transactionId: string }> {
    // 1. Verify cart (đã CHECKED_OUT)
    const cart = await this.cartRepo.findOne({
      where: {
        id: dto.cartId,
        userId,
        status: CartStatus.CHECKED_OUT,
      },
    });
    if (!cart) {
      throw new NotFoundException('Cart not found or not checked out');
    }
    if (cart.paymentStatus === CartPaymentStatus.PAID) {
      throw new ConflictException('Order already paid');
    }

    // 2. Check existing pending transaction
    const existing = await this.paymentRepo.findOne({
      where: { cartId: dto.cartId, status: PaymentStatus.PENDING },
    });
    if (existing?.paymentUrl) {
      return {
        paymentUrl: existing.paymentUrl,
        transactionId: existing.id,
      };
    }

    // 3. Get gateway
    const gateway = this.gateways.get(dto.provider);
    if (!gateway) {
      throw new BadRequestException(`Unsupported provider: ${dto.provider}`);
    }

    // 4. Create transaction record
    const transaction = this.paymentRepo.create({
      cartId: cart.id,
      userId,
      provider: dto.provider,
      amount: Number(cart.totalAmount),
      status: PaymentStatus.PENDING,
    });
    await this.paymentRepo.save(transaction);

    // 5. Call gateway
    try {
      const returnUrl = `${this.config.get('APP_URL')}/api/payments/${dto.provider}/return`;
      const result = await gateway.createPayment({
        orderId: cart.id, // dùng cartId làm orderId cho gateway
        amount: Number(cart.totalAmount),
        orderInfo: `Thanh toan don hang ${cart.id.slice(0, 8)}`,
        ipAddress,
        returnUrl,
      });

      transaction.paymentUrl = result.paymentUrl;
      transaction.providerTransactionId = result.providerTransactionId;
      transaction.status = PaymentStatus.PROCESSING;
      await this.paymentRepo.save(transaction);

      this.logger.log(
        `Payment created: cart=${cart.id} provider=${dto.provider} tx=${transaction.id}`,
      );

      return {
        paymentUrl: result.paymentUrl,
        transactionId: transaction.id,
      };
    } catch (error) {
      transaction.status = PaymentStatus.FAILED;
      transaction.errorMessage = (error as Error).message;
      await this.paymentRepo.save(transaction);
      throw error;
    }
  }

  // ============================================================
  // WEBHOOK HANDLER
  // ============================================================
  async handleWebhook(
    provider: PaymentProvider,
    data: Record<string, any>,
    ipAddress: string,
  ): Promise<any> {
    const gateway = this.gateways.get(provider);
    if (!gateway) {
      throw new BadRequestException(`Unsupported provider: ${provider}`);
    }

    // 1. VERIFY SIGNATURE
    const verifyResult = gateway.verifyWebhook(data);
    if (!verifyResult.isValid) {
      this.logger.warn(
        `⚠️ Invalid ${provider} signature from IP ${ipAddress}`,
        { orderId: verifyResult.orderId },
      );
      return gateway.buildWebhookResponse(false, 'Invalid signature');
    }

    // 2. IDEMPOTENCY — SET NX atomic (chỉ 1 lần)
    const idempotencyKey = `webhook:${provider}:${verifyResult.providerTransactionId}`;
    const acquired = await this.redis.setNX(
      idempotencyKey,
      'processing',
      WEBHOOK_IDEMPOTENCY_TTL,
    );

    if (!acquired) {
      const status = await this.redis.get(idempotencyKey);
      if (status === 'done') {
        this.logger.log(
          `Webhook already processed: ${provider} tx=${verifyResult.providerTransactionId}`,
        );
        return gateway.buildWebhookResponse(true, 'Already processed');
      }
      // Đang xử lý bởi request khác
      return gateway.buildWebhookResponse(true, 'Processing');
    }

    // 3. FIND TRANSACTION
    const transaction = await this.paymentRepo.findOne({
      where: { cartId: verifyResult.orderId, provider },
      order: { createdAt: 'DESC' },
    });

    if (!transaction) {
      this.logger.error(
        `Transaction not found: cart=${verifyResult.orderId} provider=${provider}`,
      );
      await this.redis.del(idempotencyKey); // release để retry
      return gateway.buildWebhookResponse(false, 'Transaction not found');
    }

    // 4. VERIFY AMOUNT
    if (Number(transaction.amount) !== verifyResult.amount) {
      this.logger.error(
        `Amount mismatch: expected=${transaction.amount} got=${verifyResult.amount}`,
      );
      await this.redis.del(idempotencyKey);
      return gateway.buildWebhookResponse(false, 'Invalid amount');
    }

    // 5. ATOMIC UPDATE — state machine
    const newStatus = verifyResult.isSuccess
      ? PaymentStatus.SUCCESS
      : PaymentStatus.FAILED;

    try {
      const result = await this.dataSource.transaction(async (manager) => {
        const updateResult = await manager
          .createQueryBuilder()
          .update(PaymentTransaction)
          .set({
            status: newStatus,
            providerTransactionId: verifyResult.providerTransactionId,
            providerResponse: verifyResult.rawData,
            paidAt: verifyResult.isSuccess ? new Date() : null,
            errorMessage: verifyResult.isSuccess ? null : verifyResult.message,
          })
          .where('id = :id', { id: transaction.id })
          .andWhere('status IN (:...statuses)', {
            statuses: [PaymentStatus.PENDING, PaymentStatus.PROCESSING],
          })
          .execute();

        if (updateResult.affected === 0) {
          return { alreadyProcessed: true };
        }

        // ✅ Update Cart thay Order
        if (verifyResult.isSuccess) {
          await manager
            .createQueryBuilder()
            .update(Cart)
            .set({
              paymentStatus: CartPaymentStatus.PAID,
              paidAt: new Date(),
            })
            .where('id = :id', { id: transaction.cartId })
            .andWhere('payment_status = :status', {
              status: CartPaymentStatus.UNPAID,
            })
            .execute();
        }

        return { alreadyProcessed: false };
      });

      if (result.alreadyProcessed) {
        await this.redis.set(idempotencyKey, 'done', WEBHOOK_IDEMPOTENCY_TTL);
        return gateway.buildWebhookResponse(true, 'Already processed');
      }

      // 6. Mark idempotency done
      await this.redis.set(idempotencyKey, 'done', WEBHOOK_IDEMPOTENCY_TTL);

      // 7. LOG
      this.logger.log(
        `✅ Webhook processed: ${provider} cart=${transaction.cartId} status=${newStatus}`,
        {
          transactionId: transaction.id,
          providerTxId: verifyResult.providerTransactionId,
          amount: verifyResult.amount,
          ip: ipAddress,
        },
      );

      // 8. RETURN
      return gateway.buildWebhookResponse(true, 'Confirm Success');
    } catch (error) {
      // Release lock để gateway retry
      await this.redis.del(idempotencyKey);
      this.logger.error(
        `❌ Webhook processing failed: ${provider} cart=${transaction.cartId}`,
        error,
      );
      throw error;
    }
  }

  // ============================================================
  // QUERY
  // ============================================================
  async getTransaction(userId: string, transactionId: string) {
    const tx = await this.paymentRepo.findOne({
      where: { id: transactionId, userId },
    });
    if (!tx) throw new NotFoundException('Transaction not found');
    return tx;
  }

  async getTransactionsByCart(userId: string, cartId: string) {
    return this.paymentRepo.find({
      where: { cartId, userId },
      order: { createdAt: 'DESC' },
    });
  }
}
