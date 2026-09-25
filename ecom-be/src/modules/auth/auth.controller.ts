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

  @Post('login')
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

  @Post('logout')
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

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logoutAll(
    @CurrentUser() user: User,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.logoutAll(user.id, res);
  }

  @Post('refresh')
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

    // 🆕 Resolve token opaque → userId + deviceId
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

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser() user: User) {
    return this.authService.getProfile(user.id);
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  async listSessions(@CurrentUser() user: User) {
    return this.authService.listSessions(user.id);
  }

  @Post('register/send-otp')
  @HttpCode(HttpStatus.CREATED)
  async registerSendOtp(@Body() dto: RegisterDto) {
    return this.authService.registerWithOtp(dto);
  }

  @Post('register/verify-otp')
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

  @Post('otp/resend')
  @HttpCode(HttpStatus.OK)
  async resendOtp(@Body() dto: ResendOtpDto) {
    await this.otpService.sendOtp(dto.email, dto.purpose);
    return { message: 'Đã gửi lại mã OTP' };
  }
}
