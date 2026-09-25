// src/common/decorators/device-id.decorator.ts
import {
  createParamDecorator,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';

export const DeviceId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    const deviceId = req.headers['x-device-id'] as string;
    if (!deviceId || deviceId.length < 8) {
      throw new BadRequestException('Missing or invalid X-Device-Id header');
    }
    return deviceId;
  },
);
