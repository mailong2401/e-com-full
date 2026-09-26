// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import Redis from 'ioredis';

import { UserModule } from './modules/user/user.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { MailModule } from './infrastructure/mail/mail.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserThrottlerGuard } from './common/guards/user-throttler.guard';
import { ProductModule } from './modules/product/product.module';
import { CartModule } from './modules/cart/cart.module';

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
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        // ⚠️ synchronize: chỉ true ở dev, false ở prod
        synchronize: configService.get('NODE_ENV') !== 'production',
        logging: configService.get('NODE_ENV') === 'development',
      }),
    }),

    // ===========================
    // Rate Limiting
    // ===========================
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            name: 'default',
            ttl: 60_000, // 1 phút
            limit: 100, // 100 requests/phút cho mọi route không override
          },
        ],
        // Redis storage → shared counter cho tất cả instance
        storage: new ThrottlerStorageRedisService(
          new Redis({
            host: config.get<string>('REDIS_HOST', 'localhost'),
            port: config.get<number>('REDIS_PORT', 6379),
            password: config.get<string>('REDIS_PASSWORD'),
            db: config.get<number>('REDIS_DB', 0),
            keyPrefix: 'throttle:',
          }),
        ),
      }),
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
  ],
  providers: [
    // Global throttler guard — áp dụng cho MỌI route
    // Custom guard: track theo userId nếu đã login, fallback về IP
    {
      provide: APP_GUARD,
      useClass: UserThrottlerGuard,
    },
  ],
})
export class AppModule { }
