// src/modules/user/dto/update-profile.dto.ts
import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  firstName?: string;

  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  lastName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  @Matches(/^[0-9+\-\s()]*$/, {
    message: 'Phone number is invalid',
  })
  @Transform(({ value }) => value?.trim())
  phone?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  avatar?: string;
}
