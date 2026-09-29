// src/modules/auth/services/session.service.ts
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { randomBytes, createHash } from 'crypto';
import { RedisService } from 'src/infrastructure/redis/redis.service';
import { RedisKeys } from 'src/common/constants/redis-keys.constant';

export interface SessionData {
  deviceId: string;
  refreshTokenHash: string;
  familyId: string;
  userAgent: string;
  ip: string;
  createdAt: number;
  lastUsedAt: number;
}

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);
  private readonly SESSION_TTL = 7 * 24 * 60 * 60; // 7 ngày

  constructor(private readonly redis: RedisService) { }

  /**
   * Hash refresh token bằng SHA-256 (nhanh hơn bcrypt, đủ an toàn vì token random 48 bytes)
   */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Tạo session mới cho 1 device
   * Trả về refreshToken (plain) — CHỈ trả 1 lần duy nhất
   */
  async createSession(
    userId: string,
    deviceId: string,
    userAgent: string,
    ip: string,
  ): Promise<{ refreshToken: string; familyId: string }> {
    const refreshToken = randomBytes(48).toString('hex');
    const refreshTokenHash = this.hashToken(refreshToken);
    const familyId = randomBytes(16).toString('hex');

    const session: SessionData = {
      deviceId,
      refreshTokenHash,
      familyId,
      userAgent,
      ip,
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
    };

    // Lưu session chính
    await this.redis.setJson(
      RedisKeys.SESSION(userId, deviceId),
      session,
      this.SESSION_TTL,
    );

    // Track device
    await this.redis.set(`device:${userId}:${deviceId}`, '1', this.SESSION_TTL);

    // Lưu family (dùng detect reuse)
    await this.redis.set(
      RedisKeys.SESSION_FAMILY(familyId),
      JSON.stringify({ userId, deviceId }),
      this.SESSION_TTL,
    );

    // Mapping token → { userId, deviceId } để lookup khi refresh
    await this.redis.setJson(
      `refresh:${refreshToken}`,
      { userId, deviceId },
      this.SESSION_TTL,
    );

    this.logger.log(
      `Session created: user=${userId} device=${deviceId} family=${familyId}`,
    );
    return { refreshToken, familyId };
  }

  /**
   * Resolve refresh token (opaque) → userId + deviceId
   */
  async resolveRefreshToken(
    refreshToken: string,
  ): Promise<{ userId: string; deviceId: string } | null> {
    return this.redis.getJson<{ userId: string; deviceId: string }>(
      `refresh:${refreshToken}`,
    );
  }

  /**
   * Lấy session theo userId + deviceId
   */
  async getSession(
    userId: string,
    deviceId: string,
  ): Promise<SessionData | null> {
    return this.redis.getJson<SessionData>(RedisKeys.SESSION(userId, deviceId));
  }

  /**
   * Rotate refresh token — cấp token mới, vô hiệu token cũ
   */
  // src/modules/auth/services/session.service.ts

  async rotateSession(
    userId: string,
    deviceId: string,
    userAgent: string,
    ip: string,
  ): Promise<{ refreshToken: string; familyId: string }> {
    const existing = await this.getSession(userId, deviceId);
    if (!existing) {
      throw new UnauthorizedException('Session not found or expired');
    }

    const newRefreshToken = randomBytes(48).toString('hex');
    const newHash = this.hashToken(newRefreshToken);

    // Lưu hash cũ vào grace list (5 giây) — tránh race condition
    await this.redis.set(
      `grace:${userId}:${deviceId}:${existing.refreshTokenHash}`,
      '1',
      5, // 5 giây
    );

    const updated: SessionData = {
      ...existing,
      refreshTokenHash: newHash,
      lastUsedAt: Date.now(),
      userAgent,
      ip,
    };

    await this.redis.setJson(
      RedisKeys.SESSION(userId, deviceId),
      updated,
      this.SESSION_TTL,
    );

    await this.redis.setJson(
      `refresh:${newRefreshToken}`,
      { userId, deviceId },
      this.SESSION_TTL,
    );

    return { refreshToken: newRefreshToken, familyId: existing.familyId };
  }

  async verifyRefreshToken(
    userId: string,
    deviceId: string,
    plainToken: string,
  ): Promise<boolean> {
    const session = await this.getSession(userId, deviceId);
    if (!session) return false;

    const incomingHash = this.hashToken(plainToken);

    // 1. Khớp hash hiện tại → OK
    if (incomingHash === session.refreshTokenHash) {
      return true;
    }

    // 2. Kiểm tra grace list — token cũ vừa rotate trong 5s
    const inGrace = await this.redis.exists(
      `grace:${userId}:${deviceId}:${incomingHash}`,
    );
    if (inGrace) {
      this.logger.warn(
        `Token in grace period accepted: user=${userId} device=${deviceId}`,
      );
      return true;
    }

    return false;
  }

  /**
   * Xóa 1 session (logout 1 device)
   */
  async revokeSession(userId: string, deviceId: string): Promise<void> {
    const session = await this.getSession(userId, deviceId);
    if (session) {
      await this.redis.del(RedisKeys.SESSION_FAMILY(session.familyId));
    }
    await this.redis.del(
      RedisKeys.SESSION(userId, deviceId),
      `device:${userId}:${deviceId}`,
    );
  }

  /**
   * Revoke toàn bộ session của user (logout all devices)
   */
  async revokeAllUserSessions(userId: string): Promise<void> {
    const keys = await this.redis.scanKeys(`session:${userId}:*`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
    const deviceKeys = await this.redis.scanKeys(`device:${userId}:*`);
    if (deviceKeys.length > 0) {
      await this.redis.del(...deviceKeys);
    }
    this.logger.warn(`All sessions revoked for user ${userId}`);
  }

  /**
   * List tất cả session của user
   */
  async listSessions(userId: string): Promise<SessionData[]> {
    const keys = await this.redis.scanKeys(`session:${userId}:*`);
    const sessions: SessionData[] = [];
    for (const key of keys) {
      const s = await this.redis.getJson<SessionData>(key);
      if (s) sessions.push(s);
    }
    return sessions;
  }
}
