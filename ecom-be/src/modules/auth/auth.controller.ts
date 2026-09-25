// src/modules/auth/auth.controller.ts
import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  Res,
  Headers,
  Ip,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from '../user/user.entity';
import { OtpService } from './services/otp.service';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { DeviceId } from 'src/common/decorators/device-id.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly otpService: OtpService,
  ) { }

  // ============================================================
  // LOGIN
  // ============================================================

  /**
   * Đăng nhập
   * Rate limit: 5 lần / 15 phút — chống brute force password
   */
  @Post('login')
  @Throttle({ default: { ttl: 900_000, limit: 5 } }) // 15p / 5 lần
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @DeviceId() deviceId: string,
    @Headers('user-agent') userAgent: string,
    @Ip() ip: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.login(loginDto, deviceId, userAgent, ip, res);
  }

  // ============================================================
  // REGISTER (2-step với OTP)
  // ============================================================

  /**
   * Bước 1: Gửi OTP đăng ký
   * Rate limit: 3 lần / giờ — chống spam email
   */
  @Post('register/send-otp')
  @Throttle({ default: { ttl: 3_600_000, limit: 3 } }) // 1h / 3 lần
  @HttpCode(HttpStatus.CREATED)
  async registerSendOtp(@Body() dto: RegisterDto) {
    return this.authService.registerWithOtp(dto);
  }

  /**
   * Bước 2: Xác thực OTP → tạo session
   * Rate limit: 10 lần / 15 phút — chống brute force OTP
   * (attempts counter trong OtpService đã giới hạn 5 lần/OTP)
   */
  @Post('register/verify-otp')
  @Throttle({ default: { ttl: 900_000, limit: 10 } }) // 15p / 10 lần
  @HttpCode(HttpStatus.OK)
  async registerVerifyOtp(
    @Body() dto: VerifyOtpDto,
    @DeviceId() deviceId: string,
    @Headers('user-agent') userAgent: string,
    @Ip() ip: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.verifyRegisterOtp(
      dto.email,
      dto.otp,
      deviceId,
      userAgent,
      ip,
      res,
    );
  }

  // ============================================================
  // OTP RESEND
  // ============================================================

  /**
   * Gửi lại OTP (dùng cho mọi purpose: register, forgot_password, login_2fa)
   * Rate limit: 5 lần / giờ — chống spam resend
   * (service đã có cooldown 60s/lần)
   */
  @Post('otp/resend')
  @Throttle({ default: { ttl: 3_600_000, limit: 5 } }) // 1h / 5 lần
  @HttpCode(HttpStatus.OK)
  async resendOtp(@Body() dto: ResendOtpDto) {
    await this.otpService.sendOtp(dto.email, dto.purpose);
    return { message: 'Đã gửi lại mã OTP' };
  }

  // ============================================================
  // REFRESH TOKEN
  // ============================================================

  /**
   * Làm mới access token
   * Rate limit: 20 lần / phút — client tự động refresh
   */
  @Post('refresh')
  @Throttle({ default: { ttl: 60_000, limit: 20 } }) // 1p / 20 lần
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Headers('user-agent') userAgent: string,
    @Ip() ip: string,
  ) {
    const refreshToken = req.cookies?.['refreshToken'];
    if (!refreshToken) {
      throw new UnauthorizedException('Missing refresh token');
    }

    const resolved = await this.authService.resolveRefreshToken(refreshToken);
    if (!resolved) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return this.authService.refreshTokens(
      resolved.userId,
      resolved.deviceId,
      refreshToken,
      userAgent,
      ip,
      res,
    );
  }

  // ============================================================
  // LOGOUT
  // ============================================================

  /**
   * Đăng xuất 1 device
   * Rate limit: 10 lần / phút
   */
  @Post('logout')
  @Throttle({ default: { ttl: 60_000, limit: 10 } }) // 1p / 10 lần
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: User,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const deviceId = req.cookies?.['deviceId'];
    if (!deviceId) throw new UnauthorizedException('Missing device id');
    return this.authService.logout(user.id, deviceId, res);
  }

  /**
   * Đăng xuất tất cả device
   * Rate limit: 5 lần / giờ — thao tác nguy hiểm, không nên gọi nhiều
   */
  @Post('logout-all')
  @Throttle({ default: { ttl: 3_600_000, limit: 5 } }) // 1h / 5 lần
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logoutAll(
    @CurrentUser() user: User,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.logoutAll(user.id, res);
  }

  // ============================================================
  // PROFILE / SESSIONS
  // ============================================================

  /**
   * Lấy profile của user hiện tại
   * Rate limit: 60 lần / phút
   */
  @Get('profile')
  @Throttle({ default: { ttl: 60_000, limit: 60 } }) // 1p / 60 lần
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser() user: User) {
    return this.authService.getProfile(user.id);
  }

  /**
   * List tất cả session đang active
   * Rate limit: 30 lần / phút
   */
  @Get('sessions')
  @Throttle({ default: { ttl: 60_000, limit: 30 } }) // 1p / 30 lần
  @UseGuards(JwtAuthGuard)
  async listSessions(@CurrentUser() user: User) {
    return this.authService.listSessions(user.id);
  }
}
