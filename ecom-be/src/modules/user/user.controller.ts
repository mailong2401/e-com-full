// src/modules/user/user.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import { Roles } from 'src/modules/auth/decorators/roles.decorator';
import { CurrentUser } from 'src/modules/auth/decorators/current-user.decorator';
import { UserRole } from 'src/common/enums/user-role.enum';
import { User } from './user.entity';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserController {
  constructor(private readonly userService: UserService) { }

  // ============================================================
  // ADMIN — CREATE
  // ============================================================

  /**
   * Admin tạo user mới
   * Rate limit: 20 lần / phút
   */
  @Post()
  @Roles(UserRole.ADMIN)
  @Throttle({ default: { ttl: 60_000, limit: 20 } }) // 1p / 20 lần
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createUserDto: CreateUserDto) {
    return await this.userService.create(createUserDto);
  }

  // ============================================================
  // ADMIN — LIST ALL
  // ============================================================

  /**
   * Admin list tất cả user
   * Rate limit: 100 lần / phút — admin cần xem list nhiều
   */
  @Get()
  @Roles(UserRole.ADMIN)
  @Throttle({ default: { ttl: 60_000, limit: 100 } }) // 1p / 100 lần
  async findAll() {
    return await this.userService.findAll();
  }

  // ============================================================
  // USER — OWN PROFILE
  // ============================================================

  /**
   * User xem profile của mình
   * Rate limit: 60 lần / phút
   */
  @Get('me')
  @Throttle({ default: { ttl: 60_000, limit: 60 } }) // 1p / 60 lần
  async getProfile(@CurrentUser() user: User) {
    return await this.userService.findOne(user.id);
  }

  // ============================================================
  // ADMIN — GET ONE
  // ============================================================

  /**
   * Admin xem 1 user theo id
   * Rate limit: 100 lần / phút
   */
  @Get(':id')
  @Roles(UserRole.ADMIN)
  @Throttle({ default: { ttl: 60_000, limit: 100 } }) // 1p / 100 lần
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return await this.userService.findOne(id);
  }

  // ============================================================
  // USER — UPDATE OWN PROFILE
  // ============================================================

  /**
   * User tự update profile (firstName, lastName, phone, avatar)
   * KHÔNG thể đổi role/email/username/password qua route này
   * Rate limit: 10 lần / phút — update profile không nên spam
   */
  @Patch('me')
  @Throttle({ default: { ttl: 60_000, limit: 10 } }) // 1p / 10 lần
  async updateProfile(
    @CurrentUser() user: User,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return await this.userService.updateProfile(user.id, updateProfileDto);
  }

  // ============================================================
  // ADMIN — UPDATE USER
  // ============================================================

  /**
   * Admin update user (có thể đổi email, username, password, role)
   * Rate limit: 30 lần / phút
   */
  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @Throttle({ default: { ttl: 60_000, limit: 30 } }) // 1p / 30 lần
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return await this.userService.update(id, updateUserDto);
  }

  // ============================================================
  // ADMIN — CHANGE ROLE
  // ============================================================

  /**
   * Admin đổi role của user
   * Rate limit: 10 lần / phút — thao tác nguy hiểm
   */
  @Patch(':id/role')
  @Roles(UserRole.ADMIN)
  @Throttle({ default: { ttl: 60_000, limit: 10 } }) // 1p / 10 lần
  async updateRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('role') role: UserRole,
  ) {
    return await this.userService.updateRole(id, role);
  }

  // ============================================================
  // ADMIN — DELETE USER
  // ============================================================

  /**
   * Admin xóa user
   * Rate limit: 20 lần / phút — thao tác nguy hiểm, không nên spam
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @Throttle({ default: { ttl: 60_000, limit: 20 } }) // 1p / 20 lần
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.userService.remove(id);
  }
}
