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
import { Response } from 'express';
import * as bcrypt from 'bcrypt';

import { OtpService } from './services/otp.service';
import { SessionService, SessionData } from './services/session.service';
import { OtpPurpose } from 'src/common/constants/redis-keys.constant';
import { UserService } from '../user/user.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '../user/user.entity';
import { UserRole } from 'src/common/enums/user-role.enum';

export interface TokenPayload {
  sub: string;
  email: string;
  role: UserRole;
}

/**
 * Chỉ còn access token — refresh token đi qua httpOnly cookie
 */
export interface AuthResponse {
  user: Omit<User, 'password'>;
  accessToken: string;
}

export interface RefreshResponse {
  accessToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  private readonly REFRESH_COOKIE_NAME = 'refreshToken';
  private readonly DEVICE_COOKIE_NAME = 'deviceId';
  private readonly REFRESH_COOKIE_PATH = '/api/auth';
  private readonly REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 ngày

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly otpService: OtpService,
    private readonly sessionService: SessionService,
  ) { }

  async register(
    registerDto: RegisterDto,
    deviceId: string,
    userAgent: string,
    ip: string,
    res: Response,
  ): Promise<AuthResponse> {
    const user = await this.userService.create({
      ...registerDto,
      role: UserRole.USER,
    });

    return this.issueSessionAndRespond(user, deviceId, userAgent, ip, res);
  }

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

    return this.issueSessionAndRespond(user, deviceId, userAgent, ip, res);
  }

  /**
   * Gửi OTP đăng nhập 2FA (nếu bật)
   */
  async sendLoginOtp(email: string): Promise<{ message: string }> {
    const user = await this.userService.findByEmail(email);
    const genericMessage = 'Nếu email tồn tại, mã OTP đã được gửi.';

    if (!user) {
      // Tránh leak user enumeration
      return { message: genericMessage };
    }

    await this.otpService.sendOtp(email, OtpPurpose.LOGIN_2FA);
    return { message: genericMessage };
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
      // ⚠️ Token reuse hoặc session hết hạn → revoke hết
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
    this.setAuthCookies(res, newRefreshToken, deviceId);

    return { accessToken };
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

  /**
   * Validate credentials (dùng cho LocalStrategy nếu cần)
   */
  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userService.findByEmailWithPassword(email);
    if (!user || !user.password) return null;

    const isValid = await this.userService.validatePassword(
      password,
      user.password,
    );
    return isValid ? user : null;
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
    this.setAuthCookies(res, refreshToken, deviceId);

    const { password, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, accessToken };
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

    res.cookie(this.REFRESH_COOKIE_NAME, refreshToken, baseOptions);
    res.cookie(this.DEVICE_COOKIE_NAME, deviceId, {
      ...baseOptions,
      httpOnly: false, // client có thể đọc để debug / hiển thị
    });
  }

  /**
   * Clear cookie khi logout / revoke
   */
  private clearAuthCookies(res: Response): void {
    const opts = { path: this.REFRESH_COOKIE_PATH };
    res.clearCookie(this.REFRESH_COOKIE_NAME, opts);
    res.clearCookie(this.DEVICE_COOKIE_NAME, opts);
  }
  async resolveRefreshToken(
    refreshToken: string,
  ): Promise<{ userId: string; deviceId: string } | null> {
    return this.sessionService.resolveRefreshToken(refreshToken);
  }
}
