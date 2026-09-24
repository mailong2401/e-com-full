// src/auth/auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OtpService } from './services/otp.service';
import { OtpPurpose } from 'src/common/constants/redis-keys.constant';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
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

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly otpService: OtpService,
  ) { }

  async register(registerDto: RegisterDto): Promise<{
    user: Omit<User, 'password'>;
    tokens: AuthTokens;
  }> {
    const user = await this.userService.create({
      ...registerDto,
      role: UserRole.USER,
    });

    const tokens = await this.generateTokens(user);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    const { password, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, tokens };
  }

  async verifyRegisterOtp(
    email: string,
    otp: string,
  ): Promise<{ user: Omit<User, 'password'>; tokens: AuthTokens }> {
    await this.otpService.verifyOtp(email, otp, OtpPurpose.REGISTER);

    const user = await this.userService.findByEmail(email);
    if (!user) throw new BadRequestException('User không tồn tại');

    // Đánh dấu đã verify (nếu có field isVerified trong entity)
    // await this.userService.markVerified(user.id);

    const tokens = await this.generateTokens(user);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    const { password, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, tokens };
  }

  /**
   * Đăng ký bước 1: Tạo user + gửi OTP
   * KHÔNG trả token — user phải verify OTP trước
   */
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
  /**
   * Login 2FA: verify OTP
   */
  async sendLoginOtp(email: string): Promise<{ message: string }> {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      // Tránh leak user enumeration → trả message chung
      return { message: 'Nếu email tồn tại, mã OTP đã được gửi.' };
    }
    await this.otpService.sendOtp(email, OtpPurpose.LOGIN_2FA);
    return { message: 'Nếu email tồn tại, mã OTP đã được gửi.' };
  }

  async login(loginDto: LoginDto): Promise<{
    user: Omit<User, 'password'>;
    tokens: AuthTokens;
  }> {
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

    const tokens = await this.generateTokens(user);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    const { password, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, tokens };
  }

  async logout(userId: string): Promise<{ message: string }> {
    await this.updateRefreshToken(userId, null);
    return { message: 'Logged out successfully' };
  }

  async refreshTokens(
    userId: string,
    refreshToken: string,
  ): Promise<AuthTokens> {
    const user = await this.userService.findByIdWithRefreshToken(userId);

    if (!user || !user.refreshToken) {
      throw new ForbiddenException('Access denied');
    }

    const isValid = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!isValid) {
      // Token reuse detected → revoke all sessions
      await this.userService.updateRefreshToken(userId, null);
      throw new ForbiddenException('Invalid refresh token');
    }

    const tokens = await this.generateTokens(user);
    await this.updateRefreshToken(user.id, tokens.refreshToken);
    return tokens;
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userService.findByEmailWithPassword(email);

    if (!user || !user.password) {
      return null;
    }

    const isPasswordValid = await this.userService.validatePassword(
      password,
      user.password,
    );

    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  async getProfile(userId: string): Promise<Omit<User, 'password'>> {
    const user = await this.userService.findOne(userId);
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  private async generateTokens(user: User): Promise<AuthTokens> {
    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.get<string>(
          'JWT_ACCESS_EXPIRES_IN',
          '15m',
        ) as any,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>(
          'JWT_REFRESH_EXPIRES_IN',
          '7d',
        ) as any,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async updateRefreshToken(
    userId: string,
    refreshToken: string | null,
  ): Promise<void> {
    const hashedToken = refreshToken
      ? await bcrypt.hash(refreshToken, 10)
      : null;
    await this.userService.updateRefreshToken(userId, hashedToken);
  }
}
