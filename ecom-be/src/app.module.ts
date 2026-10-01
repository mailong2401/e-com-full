// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { UserModule } from './modules/user/user.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { MailModule } from './infrastructure/mail/mail.module';
import { AuthModule } from './modules/auth/auth.module';
// import { UserThrottlerGuard } from './common/guards/user-throttler.guard';
import { ProductModule } from './modules/product/product.module';
import { CartModule } from './modules/cart/cart.module';
import { PaymentModule } from './modules/payment/payment.module';
import { CsrfGuard } from './common/guards/csrf.guard';
import { getDatabaseConfig } from './config/database.config';
import { getThrottlerConfig } from './config/throttler.config';

@Module({
  imports: [
    // ===========================
    // Config (global)
    // ===========================
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),

    // ===========================
    // Database
    // ===========================
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getDatabaseConfig,
    }),

    // ===========================
    // Rate Limiting
    // ===========================
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getThrottlerConfig,
    }),

    // ===========================
    // Infrastructure
    // ===========================
    RedisModule,
    MailModule,

    // ===========================
    // Feature modules
    // ===========================
    UserModule,
    AuthModule,
    ProductModule,
    CartModule,
    PaymentModule,
  ],
  providers: [
    // Global throttler guard — áp dụng cho MỌI route
    // Custom guard: track theo userId nếu đã login, fallback về IP
    // {
    //   provide: APP_GUARD,
    //   useClass: UserThrottlerGuard,
    // },
    { provide: APP_GUARD, useClass: CsrfGuard },
  ],
})
export class AppModule { }
