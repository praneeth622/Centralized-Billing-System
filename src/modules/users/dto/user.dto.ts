import { IsString, IsEmail, IsOptional, IsArray, IsObject, ValidateNested, IsNotEmpty, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { BaseDto } from '../../../shared/dto/base.dto';

export class CreateUserDto extends BaseDto {
  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@acme.com',
    required: true,
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'User first name',
    example: 'John',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({
    description: 'Organization ID this user belongs to',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  organizationId: string;

  @ApiProperty({
    description: 'User role within the organization',
    example: 'admin',
    required: false,
  })
  @IsString()
  @IsOptional()
  role?: string;

  @ApiProperty({
    description: 'User department',
    example: 'Engineering',
    required: false,
  })
  @IsString()
  @IsOptional()
  department?: string;

  @ApiProperty({
    description: 'User job title',
    example: 'Senior Software Engineer',
    required: false,
  })
  @IsString()
  @IsOptional()
  jobTitle?: string;

  @ApiProperty({
    description: 'User phone number',
    example: '+1-555-123-4567',
    required: false,
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({
    description: 'User avatar URL',
    example: 'https://example.com/avatar.jpg',
    required: false,
  })
  @IsString()
  @IsOptional()
  avatar?: string;

  @ApiProperty({
    description: 'User timezone',
    example: 'America/New_York',
    required: false,
  })
  @IsString()
  @IsOptional()
  timezone?: string;

  @ApiProperty({
    description: 'User locale preference',
    example: 'en-US',
    required: false,
  })
  @IsString()
  @IsOptional()
  locale?: string;

  @ApiProperty({
    description: 'Additional user metadata',
    example: { preferences: { theme: 'dark' }, onboardingComplete: true },
    required: false,
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'External clerk user ID',
    example: 'clerk_user_12345',
    required: false,
  })
  @IsString()
  @IsOptional()
  clerkUserId?: string;
}

export class UpdateUserDto extends BaseDto {
  @ApiProperty({
    description: 'User email address',
    example: 'john.doe.updated@acme.com',
    required: false,
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({
    description: 'User first name',
    example: 'Jonathan',
    required: false,
  })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe-Smith',
    required: false,
  })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiProperty({
    description: 'User role within the organization',
    example: 'senior-admin',
    required: false,
  })
  @IsString()
  @IsOptional()
  role?: string;

  @ApiProperty({
    description: 'User department',
    example: 'Engineering Management',
    required: false,
  })
  @IsString()
  @IsOptional()
  department?: string;

  @ApiProperty({
    description: 'User job title',
    example: 'Principal Software Engineer',
    required: false,
  })
  @IsString()
  @IsOptional()
  jobTitle?: string;

  @ApiProperty({
    description: 'User phone number',
    example: '+1-555-987-6543',
    required: false,
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({
    description: 'User avatar URL',
    example: 'https://example.com/updated-avatar.jpg',
    required: false,
  })
  @IsString()
  @IsOptional()
  avatar?: string;

  @ApiProperty({
    description: 'User timezone',
    example: 'America/Los_Angeles',
    required: false,
  })
  @IsString()
  @IsOptional()
  timezone?: string;

  @ApiProperty({
    description: 'User locale preference',
    example: 'en-CA',
    required: false,
  })
  @IsString()
  @IsOptional()
  locale?: string;

  @ApiProperty({
    description: 'Active status',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({
    description: 'Additional user metadata',
    example: { preferences: { theme: 'light' }, onboardingComplete: true },
    required: false,
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UserResponseDto extends BaseDto {
  @ApiProperty({
    description: 'User unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  id: string;

  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@acme.com',
  })
  email: string;

  @ApiProperty({
    description: 'User first name',
    example: 'John',
  })
  firstName: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
  })
  lastName: string;

  @ApiProperty({
    description: 'User full name (computed)',
    example: 'John Doe',
  })
  fullName: string;

  @ApiProperty({
    description: 'Organization ID this user belongs to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  organizationId: string;

  @ApiProperty({
    description: 'User role within the organization',
    example: 'admin',
    required: false,
  })
  role?: string;

  @ApiProperty({
    description: 'User department',
    example: 'Engineering',
    required: false,
  })
  department?: string;

  @ApiProperty({
    description: 'User job title',
    example: 'Senior Software Engineer',
    required: false,
  })
  jobTitle?: string;

  @ApiProperty({
    description: 'User phone number',
    example: '+1-555-123-4567',
    required: false,
  })
  phone?: string;

  @ApiProperty({
    description: 'User avatar URL',
    example: 'https://example.com/avatar.jpg',
    required: false,
  })
  avatar?: string;

  @ApiProperty({
    description: 'User timezone',
    example: 'America/New_York',
    required: false,
  })
  timezone?: string;

  @ApiProperty({
    description: 'User locale preference',
    example: 'en-US',
    required: false,
  })
  locale?: string;

  @ApiProperty({
    description: 'Active status',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Additional user metadata',
    example: { preferences: { theme: 'dark' }, onboardingComplete: true },
    required: false,
  })
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'External clerk user ID',
    example: 'clerk_user_12345',
    required: false,
  })
  clerkUserId?: string;

  @ApiProperty({
    description: 'User creation timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'User last update timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'Last login timestamp',
    example: '2024-01-15T10:30:00.000Z',
    required: false,
  })
  lastLoginAt?: Date;
}