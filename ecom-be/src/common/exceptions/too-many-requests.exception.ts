// src/common/exceptions/too-many-requests.exception.ts
import { HttpException, HttpStatus } from '@nestjs/common';

export class TooManyRequestsException extends HttpException {
  constructor(message: string = 'Too Many Requests') {
    super(message, HttpStatus.TOO_MANY_REQUESTS); // 429
  }
}
