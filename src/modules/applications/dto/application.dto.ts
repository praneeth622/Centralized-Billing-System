import { IsString, IsOptional, IsArray, IsObject, IsNotEmpty, IsUrl, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BaseDto } from '../../../shared/dto/base.dto';

export class CreateApplicationDto extends BaseDto {
  @ApiProperty({
    description: 'Application name',
    example: 'HealOS',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Application slug for URL-friendly identifier',
    example: 'healos',
    required: false,
  })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiProperty({
    description: 'Application description',
    example: 'Healthcare Operating System for medical practices',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Application version',
    example: '1.0.0',
    required: false,
  })
  @IsString()
  @IsOptional()
  version?: string;

  @ApiProperty({
    description: 'Application homepage URL',
    example: 'https://healos.app',
    required: false,
  })
  @IsUrl()
  @IsOptional()
  homepage?: string;

  @ApiProperty({
    description: 'Application logo URL',
    example: 'https://healos.app/logo.png',
    required: false,
  })
  @IsUrl()
  @IsOptional()
  logo?: string;

  @ApiProperty({
    description: 'Application category',
    example: 'Healthcare',
    required: false,
  })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({
    description: 'Application tags for categorization',
    example: ['healthcare', 'ehr', 'practice-management'],
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiProperty({
    description: 'Application features list',
    example: ['Patient Management', 'Appointment Scheduling', 'Billing Integration'],
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  features?: string[];

  @ApiProperty({
    description: 'Supported platforms',
    example: ['web', 'mobile', 'desktop'],
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  platforms?: string[];

  @ApiProperty({
    description: 'Application configuration settings',
    example: { 
      defaultLanding: '/dashboard',
      theme: 'healthcare',
      integrations: ['stripe', 'clerk']
    },
    required: false,
  })
  @IsObject()
  @IsOptional()
  config?: Record<string, any>;

  @ApiProperty({
    description: 'Additional application metadata',
    example: { 
      developer: 'Attack Capital',
      license: 'proprietary',
      supportEmail: 'support@healos.app'
    },
    required: false,
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class ApplicationResponseDto extends BaseDto {
  @ApiProperty({
    description: 'Application unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  id: string;

  @ApiProperty({
    description: 'Application name',
    example: 'HealOS',
  })
  name: string;

  @ApiProperty({
    description: 'Application slug for URL-friendly identifier',
    example: 'healos',
  })
  slug: string;

  @ApiProperty({
    description: 'Application description',
    example: 'Healthcare Operating System for medical practices',
    required: false,
  })
  description?: string;

  @ApiProperty({
    description: 'Application version',
    example: '1.0.0',
    required: false,
  })
  version?: string;

  @ApiProperty({
    description: 'Application homepage URL',
    example: 'https://healos.app',
    required: false,
  })
  homepage?: string;

  @ApiProperty({
    description: 'Application logo URL',
    example: 'https://healos.app/logo.png',
    required: false,
  })
  logo?: string;

  @ApiProperty({
    description: 'Application category',
    example: 'Healthcare',
    required: false,
  })
  category?: string;

  @ApiProperty({
    description: 'Application tags for categorization',
    example: ['healthcare', 'ehr', 'practice-management'],
    required: false,
  })
  tags?: string[];

  @ApiProperty({
    description: 'Application features list',
    example: ['Patient Management', 'Appointment Scheduling', 'Billing Integration'],
    required: false,
  })
  features?: string[];

  @ApiProperty({
    description: 'Supported platforms',
    example: ['web', 'mobile', 'desktop'],
    required: false,
  })
  platforms?: string[];

  @ApiProperty({
    description: 'Active status',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Application configuration settings',
    example: { 
      defaultLanding: '/dashboard',
      theme: 'healthcare',
      integrations: ['stripe', 'clerk']
    },
    required: false,
  })
  config?: Record<string, any>;

  @ApiProperty({
    description: 'Additional application metadata',
    example: { 
      developer: 'Attack Capital',
      license: 'proprietary',
      supportEmail: 'support@healos.app'
    },
    required: false,
  })
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'Application creation timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Application last update timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'Total number of organizations using this application',
    example: 150,
  })
  totalOrganizations?: number;

  @ApiProperty({
    description: 'Total number of active subscriptions',
    example: 145,
  })
  totalActiveSubscriptions?: number;
}