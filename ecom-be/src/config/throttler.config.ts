// config/throttler.config.ts
import { ConfigService } from '@nestjs/config';
import { ThrottlerModuleOptions } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import Redis from 'ioredis';

export const getThrottlerConfig = (
  config: ConfigService,
): ThrottlerModuleOptions => ({
  throttlers: [
    {
      name: 'default',
      ttl: 60_000, // 1 phút
      limit: 10_000, // 10000 requests/phút cho mọi route không override
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
});
