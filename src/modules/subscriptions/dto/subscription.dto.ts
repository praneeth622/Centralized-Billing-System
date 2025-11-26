import { IsString, IsOptional, IsNumber, IsEnum, IsObject, IsNotEmpty, IsDecimal, IsBoolean, ValidateNested, IsArray, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { BaseDto } from '../../../shared/dto/base.dto';
import { BillingInterval, SubscriptionStatus } from '@prisma/client';

export class CreateSubscriptionPlanDto extends BaseDto {
  @ApiProperty({
    description: 'Subscription plan name',
    example: 'HealOS Professional',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Plan slug for URL-friendly identifier',
    example: 'healos-professional',
    required: false,
  })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiProperty({
    description: 'Application ID this plan belongs to',
    example: '123e4567-e89b-12d3-a456-426614174002',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  applicationId: string;

  @ApiProperty({
    description: 'Plan description',
    example: 'Professional tier with advanced features for growing practices',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Price per seat in cents',
    example: 9900,
    required: true,
  })
  @IsNumber()
  @Min(0)
  pricePerSeat: number;

  @ApiProperty({
    description: 'Billing interval',
    enum: BillingInterval,
    example: BillingInterval.MONTHLY,
    required: true,
  })
  @IsEnum(BillingInterval)
  billingInterval: BillingInterval;

  @ApiProperty({
    description: 'Currency code (ISO 4217)',
    example: 'USD',
    required: false,
  })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({
    description: 'Minimum number of seats required',
    example: 1,
    required: false,
  })
  @IsNumber()
  @Min(1)
  @IsOptional()
  minSeats?: number;

  @ApiProperty({
    description: 'Maximum number of seats allowed',
    example: 1000,
    required: false,
  })
  @IsNumber()
  @Min(1)
  @IsOptional()
  maxSeats?: number;

  @ApiProperty({
    description: 'Trial period in days',
    example: 14,
    required: false,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  trialPeriodDays?: number;

  @ApiProperty({
    description: 'Plan features list',
    example: ['Advanced Analytics', 'Priority Support', 'Custom Integrations'],
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  features?: string[];

  @ApiProperty({
    description: 'Additional plan metadata',
    example: { 
      tier: 'professional',
      priority: 2,
      supportLevel: 'premium'
    },
    required: false,
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'External Stripe price ID',
    example: 'price_12345',
    required: false,
  })
  @IsString()
  @IsOptional()
  stripePriceId?: string;
}

export class SubscriptionPlanResponseDto extends BaseDto {
  @ApiProperty({
    description: 'Plan unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174003',
  })
  id: string;

  @ApiProperty({
    description: 'Subscription plan name',
    example: 'HealOS Professional',
  })
  name: string;

  @ApiProperty({
    description: 'Plan slug for URL-friendly identifier',
    example: 'healos-professional',
  })
  slug: string;

  @ApiProperty({
    description: 'Application ID this plan belongs to',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  applicationId: string;

  @ApiProperty({
    description: 'Plan description',
    example: 'Professional tier with advanced features for growing practices',
    required: false,
  })
  description?: string;

  @ApiProperty({
    description: 'Price per seat in cents',
    example: 9900,
  })
  pricePerSeat: number;

  @ApiProperty({
    description: 'Billing interval',
    enum: BillingInterval,
    example: BillingInterval.MONTHLY,
  })
  billingInterval: BillingInterval;

  @ApiProperty({
    description: 'Currency code (ISO 4217)',
    example: 'USD',
  })
  currency: string;

  @ApiProperty({
    description: 'Minimum number of seats required',
    example: 1,
    required: false,
  })
  minSeats?: number;

  @ApiProperty({
    description: 'Maximum number of seats allowed',
    example: 1000,
    required: false,
  })
  maxSeats?: number;

  @ApiProperty({
    description: 'Trial period in days',
    example: 14,
    required: false,
  })
  trialPeriodDays?: number;

  @ApiProperty({
    description: 'Plan features list',
    example: ['Advanced Analytics', 'Priority Support', 'Custom Integrations'],
    required: false,
  })
  features?: string[];

  @ApiProperty({
    description: 'Active status',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Additional plan metadata',
    example: { 
      tier: 'professional',
      priority: 2,
      supportLevel: 'premium'
    },
    required: false,
  })
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'External Stripe price ID',
    example: 'price_12345',
    required: false,
  })
  stripePriceId?: string;

  @ApiProperty({
    description: 'Plan creation timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Plan last update timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  updatedAt: Date;
}

export class CreateSubscriptionDto extends BaseDto {
  @ApiProperty({
    description: 'Organization ID for the subscription',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  organizationId: string;

  @ApiProperty({
    description: 'Subscription plan ID',
    example: '123e4567-e89b-12d3-a456-426614174003',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  planId: string;

  @ApiProperty({
    description: 'Number of seats to subscribe for',
    example: 10,
    required: true,
  })
  @IsNumber()
  @Min(1)
  seatQuantity: number;

  @ApiProperty({
    description: 'Subscription start date (ISO string)',
    example: '2024-01-15T00:00:00.000Z',
    required: false,
  })
  @IsOptional()
  startDate?: Date;

  @ApiProperty({
    description: 'Subscription end date (ISO string)',
    example: '2024-12-31T23:59:59.999Z',
    required: false,
  })
  @IsOptional()
  endDate?: Date;

  @ApiProperty({
    description: 'Trial end date (ISO string)',
    example: '2024-01-29T23:59:59.999Z',
    required: false,
  })
  @IsOptional()
  trialEndDate?: Date;

  @ApiProperty({
    description: 'Additional subscription metadata',
    example: { 
      source: 'signup-flow',
      campaign: 'q1-promotion',
      notes: 'Migrated from legacy system'
    },
    required: false,
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'External Stripe subscription ID',
    example: 'sub_12345',
    required: false,
  })
  @IsString()
  @IsOptional()
  stripeSubscriptionId?: string;
}

export class UpdateSubscriptionDto extends BaseDto {
  @ApiProperty({
    description: 'Number of seats to update to',
    example: 15,
    required: false,
  })
  @IsNumber()
  @Min(1)
  @IsOptional()
  seatQuantity?: number;

  @ApiProperty({
    description: 'Subscription status',
    enum: SubscriptionStatus,
    example: SubscriptionStatus.ACTIVE,
    required: false,
  })
  @IsEnum(SubscriptionStatus)
  @IsOptional()
  status?: SubscriptionStatus;

  @ApiProperty({
    description: 'Subscription end date (ISO string)',
    example: '2025-12-31T23:59:59.999Z',
    required: false,
  })
  @IsOptional()
  endDate?: Date;

  @ApiProperty({
    description: 'Trial end date (ISO string)',
    example: '2024-02-15T23:59:59.999Z',
    required: false,
  })
  @IsOptional()
  trialEndDate?: Date;

  @ApiProperty({
    description: 'Additional subscription metadata',
    example: { 
      upgraded: true,
      upgradeReason: 'team-growth',
      notes: 'Customer requested more seats'
    },
    required: false,
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class SubscriptionResponseDto extends BaseDto {
  @ApiProperty({
    description: 'Subscription unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174004',
  })
  id: string;

  @ApiProperty({
    description: 'Organization ID for the subscription',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  organizationId: string;

  @ApiProperty({
    description: 'Subscription plan ID',
    example: '123e4567-e89b-12d3-a456-426614174003',
  })
  planId: string;

  @ApiProperty({
    description: 'Number of seats subscribed',
    example: 10,
  })
  seatQuantity: number;

  @ApiProperty({
    description: 'Number of assigned seats',
    example: 8,
  })
  seatsAssigned: number;

  @ApiProperty({
    description: 'Number of available seats',
    example: 2,
  })
  seatsAvailable: number;

  @ApiProperty({
    description: 'Subscription status',
    enum: SubscriptionStatus,
    example: SubscriptionStatus.ACTIVE,
  })
  status: SubscriptionStatus;

  @ApiProperty({
    description: 'Subscription start date',
    example: '2024-01-15T00:00:00.000Z',
  })
  startDate: Date;

  @ApiProperty({
    description: 'Subscription end date',
    example: '2024-12-31T23:59:59.999Z',
    required: false,
  })
  endDate?: Date;

  @ApiProperty({
    description: 'Trial end date',
    example: '2024-01-29T23:59:59.999Z',
    required: false,
  })
  trialEndDate?: Date;

  @ApiProperty({
    description: 'Current period start date',
    example: '2024-01-15T00:00:00.000Z',
  })
  currentPeriodStart: Date;

  @ApiProperty({
    description: 'Current period end date',
    example: '2024-02-15T00:00:00.000Z',
  })
  currentPeriodEnd: Date;

  @ApiProperty({
    description: 'Next billing date',
    example: '2024-02-15T00:00:00.000Z',
    required: false,
  })
  nextBillingDate?: Date;

  @ApiProperty({
    description: 'Monthly Recurring Revenue in cents',
    example: 99000,
  })
  mrr: number;

  @ApiProperty({
    description: 'Annual Recurring Revenue in cents',
    example: 1188000,
  })
  arr: number;

  @ApiProperty({
    description: 'Additional subscription metadata',
    example: { 
      source: 'signup-flow',
      campaign: 'q1-promotion'
    },
    required: false,
  })
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'External Stripe subscription ID',
    example: 'sub_12345',
    required: false,
  })
  stripeSubscriptionId?: string;

  @ApiProperty({
    description: 'Subscription creation timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Subscription last update timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'Plan details',
    type: () => SubscriptionPlanResponseDto,
    required: false,
  })
  plan?: SubscriptionPlanResponseDto;
}