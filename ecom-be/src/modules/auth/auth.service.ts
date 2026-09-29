// src/modules/auth/auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { OtpService } from './services/otp.service';
import { SessionService, SessionData } from './services/session.service';
import { OtpPurpose } from 'src/common/constants/redis-keys.constant';
import { UserService } from '../user/user.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '../user/user.entity';
import { UserRole } from 'src/common/enums/user-role.enum';
import { TokenPayload } from './interface/token-payload.interface';
import { AuthResponse } from './interface/auth-response.interface';
import { RefreshResponse } from './interface/refresh-response.interface';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  private readonly ACCESS_COOKIE_NAME = 'accessToken';
  private readonly REFRESH_COOKIE_NAME = 'refreshToken';
  private readonly DEVICE_COOKIE_NAME = 'deviceId';
  private readonly CSRF_COOKIE_NAME = 'csrfToken';

  private readonly COOKIE_PATH = '/';
  private readonly REFRESH_COOKIE_PATH = '/api/auth';
  private readonly REFRESH_PATH = '/api/auth';

  private readonly ACCESS_TTL_MS = 15 * 60 * 1000; // 15 phút
  private readonly REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 ngày

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly otpService: OtpService,
    private readonly sessionService: SessionService,
  ) { }

  async registerWithOtp(
    registerDto: RegisterDto,
  ): Promise<{ message: string }> {
    const user = await this.userService.create({
      ...registerDto,
      role: UserRole.USER,
    });

    await this.otpService.sendOtp(user.email, OtpPurpose.REGISTER);

    return {
      message: 'Đăng ký thành công. Vui lòng kiểm tra email để lấy mã OTP.',
    };
  }

  async verifyRegisterOtp(
    email: string,
    otp: string,
    deviceId: string,
    userAgent: string,
    ip: string,
    res: Response,
  ): Promise<AuthResponse> {
    await this.otpService.verifyOtp(email, otp, OtpPurpose.REGISTER);

    const user = await this.userService.findByEmail(email);
    if (!user) throw new BadRequestException('User không tồn tại');

    await this.userService.markVerified(user.id);
    user.isVerified = true;

    return this.issueSessionAndRespond(user, deviceId, userAgent, ip, res);
  }

  async login(
    loginDto: LoginDto,
    deviceId: string,
    userAgent: string,
    ip: string,
    res: Response,
  ): Promise<AuthResponse> {
    const user = await this.userService.findByEmailWithPassword(loginDto.email);

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await this.userService.validatePassword(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.isVerified) {
      throw new UnauthorizedException(
        'Tài khoản chưa được xác thực. Vui lòng xác thực OTP.',
      );
    }

    return this.issueSessionAndRespond(user, deviceId, userAgent, ip, res);
  }

  async refreshTokens(
    userId: string,
    deviceId: string,
    refreshTokenFromCookie: string,
    userAgent: string,
    ip: string,
    res: Response,
  ): Promise<RefreshResponse> {
    // 1. Verify với hash trong session
    const isValid = await this.sessionService.verifyRefreshToken(
      userId,
      deviceId,
      refreshTokenFromCookie,
    );

    if (!isValid) {
      //Token reuse hoặc session hết hạn → revoke hết
      this.logger.warn(
        `Possible token reuse: user=${userId} device=${deviceId} — revoking all sessions`,
      );
      await this.sessionService.revokeAllUserSessions(userId);
      this.clearAuthCookies(res);
      throw new ForbiddenException(
        'Invalid refresh token. All sessions revoked.',
      );
    }

    // 2. Rotate — cấp refresh token mới
    const { refreshToken: newRefreshToken } =
      await this.sessionService.rotateSession(userId, deviceId, userAgent, ip);

    // 3. Load user + sign access token mới
    const user = await this.userService.findOne(userId);
    const accessToken = await this.signAccessToken(user);

    // 4. Set cookie mới
    this.setAuthCookies(res, accessToken, newRefreshToken, deviceId);

    return { message: 'Token refreshed' };
  }

  async logout(
    userId: string,
    deviceId: string,
    res: Response,
  ): Promise<{ message: string }> {
    await this.sessionService.revokeSession(userId, deviceId);
    this.clearAuthCookies(res);
    return { message: 'Logged out successfully' };
  }

  /**
   * Logout tất cả device
   */
  async logoutAll(userId: string, res: Response): Promise<{ message: string }> {
    await this.sessionService.revokeAllUserSessions(userId);
    this.clearAuthCookies(res);
    return { message: 'Logged out from all devices' };
  }

  async listSessions(
    userId: string,
  ): Promise<Array<Omit<SessionData, 'refreshTokenHash'>>> {
    const sessions = await this.sessionService.listSessions(userId);
    return sessions.map(({ refreshTokenHash, ...safe }) => safe);
  }
  async getProfile(userId: string): Promise<Omit<User, 'password'>> {
    const user = await this.userService.findOne(userId);
    const { password, ...safe } = user;
    return safe;
  }

  private async issueSessionAndRespond(
    user: User,
    deviceId: string,
    userAgent: string,
    ip: string,
    res: Response,
  ): Promise<AuthResponse> {
    const { refreshToken } = await this.sessionService.createSession(
      user.id,
      deviceId,
      userAgent,
      ip,
    );

    const accessToken = await this.signAccessToken(user);
    this.setAuthCookies(res, accessToken, refreshToken, deviceId);

    const { password, ...userWithoutPassword } = user;
    return { user: userWithoutPassword };
  }

  /**
   * Sign access token (JWT)
   */
  private async signAccessToken(user: User): Promise<string> {
    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.get<string>(
        'JWT_ACCESS_EXPIRES_IN',
        '15m',
      ) as any,
    });
  }

  /**
   * Set httpOnly cookie cho refresh token + device id
   */
  private setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
    deviceId: string,
  ): void {
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';

    const baseOptions = {
      httpOnly: true, // JS không đọc được
      secure: isProduction, // HTTPS only ở prod
      sameSite: 'strict' as const, // chống CSRF
      maxAge: this.REFRESH_TTL_MS,
      path: this.REFRESH_COOKIE_PATH,
    };

    res.cookie(this.ACCESS_COOKIE_NAME, accessToken, {
      ...baseOptions,
      maxAge: this.ACCESS_TTL_MS,
      path: '/',
    });

    // 2. Refresh token — chỉ gửi cho /api/auth/*
    res.cookie(this.REFRESH_COOKIE_NAME, refreshToken, {
      ...baseOptions,
      maxAge: this.REFRESH_TTL_MS,
      path: this.REFRESH_PATH,
    });

    // 3. Device ID — non-httpOnly (frontend cần đọc để gửi header)
    res.cookie(this.DEVICE_COOKIE_NAME, deviceId, {
      ...baseOptions,
      httpOnly: false,
      maxAge: this.REFRESH_TTL_MS,
      path: '/',
    });

    // 4. CSRF token — non-httpOnly (frontend phải đọc để gửi header)
    const csrfToken = randomBytes(32).toString('hex');
    res.cookie(this.CSRF_COOKIE_NAME, csrfToken, {
      ...baseOptions,
      httpOnly: false,
      maxAge: this.REFRESH_TTL_MS,
      path: '/',
    });
  }

  /**
   * Clear cookie khi logout / revoke
   */
  private clearAuthCookies(res: Response): void {
    res.clearCookie(this.ACCESS_COOKIE_NAME, { path: '/' });
    res.clearCookie(this.REFRESH_COOKIE_NAME, { path: this.REFRESH_PATH });
    res.clearCookie(this.DEVICE_COOKIE_NAME, { path: '/' });
    res.clearCookie(this.CSRF_COOKIE_NAME, { path: '/' });
  }
  async resolveRefreshToken(
    refreshToken: string,
  ): Promise<{ userId: string; deviceId: string } | null> {
    return this.sessionService.resolveRefreshToken(refreshToken);
  }
}
