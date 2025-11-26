import { IsString, IsOptional, IsNumber, IsEnum, IsObject, IsNotEmpty, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BaseDto } from '../../../shared/dto/base.dto';
import { PaymentStatus } from '@prisma/client';

export class CreatePaymentDto extends BaseDto {
  @ApiProperty({
    description: 'Organization ID for the payment',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  organizationId: string;

  @ApiProperty({
    description: 'Subscription ID this payment is for',
    example: '123e4567-e89b-12d3-a456-426614174004',
    required: false,
  })
  @IsString()
  @IsOptional()
  subscriptionId?: string;

  @ApiProperty({
    description: 'Payment amount in cents',
    example: 99000,
    required: true,
  })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({
    description: 'Currency code (ISO 4217)',
    example: 'USD',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  currency: string;

  @ApiProperty({
    description: 'Payment status',
    enum: PaymentStatus,
    example: PaymentStatus.SUCCEEDED,
    required: false,
  })
  @IsEnum(PaymentStatus)
  @IsOptional()
  status?: PaymentStatus;

  @ApiProperty({
    description: 'Payment method type',
    example: 'card',
    required: false,
  })
  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @ApiProperty({
    description: 'Payment description or memo',
    example: 'Monthly subscription payment for HealOS Professional',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Invoice number or reference',
    example: 'INV-2024-001',
    required: false,
  })
  @IsString()
  @IsOptional()
  invoiceId?: string;

  @ApiProperty({
    description: 'Additional payment metadata',
    example: { 
      campaignId: 'q1-promo',
      source: 'web-checkout',
      customerNote: 'Urgent processing required'
    },
    required: false,
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'External Stripe payment intent ID',
    example: 'pi_12345',
    required: false,
  })
  @IsString()
  @IsOptional()
  stripePaymentIntentId?: string;

  @ApiProperty({
    description: 'External Stripe charge ID',
    example: 'ch_12345',
    required: false,
  })
  @IsString()
  @IsOptional()
  stripeChargeId?: string;
}

export class PaymentResponseDto extends BaseDto {
  @ApiProperty({
    description: 'Payment unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174006',
  })
  id: string;

  @ApiProperty({
    description: 'Organization ID for the payment',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  organizationId: string;

  @ApiProperty({
    description: 'Subscription ID this payment is for',
    example: '123e4567-e89b-12d3-a456-426614174004',
    required: false,
  })
  subscriptionId?: string;

  @ApiProperty({
    description: 'Payment amount in cents',
    example: 99000,
  })
  amount: number;

  @ApiProperty({
    description: 'Currency code (ISO 4217)',
    example: 'USD',
  })
  currency: string;

  @ApiProperty({
    description: 'Payment status',
    enum: PaymentStatus,
    example: PaymentStatus.SUCCEEDED,
  })
  status: PaymentStatus;

  @ApiProperty({
    description: 'Payment method type',
    example: 'card',
    required: false,
  })
  paymentMethod?: string;

  @ApiProperty({
    description: 'Payment description or memo',
    example: 'Monthly subscription payment for HealOS Professional',
    required: false,
  })
  description?: string;

  @ApiProperty({
    description: 'Invoice number or reference',
    example: 'INV-2024-001',
    required: false,
  })
  invoiceId?: string;

  @ApiProperty({
    description: 'Payment date/time',
    example: '2024-01-15T10:30:00.000Z',
  })
  paidAt: Date;

  @ApiProperty({
    description: 'Payment due date',
    example: '2024-01-15T23:59:59.999Z',
    required: false,
  })
  dueDate?: Date;

  @ApiProperty({
    description: 'Payment processing fee in cents',
    example: 320,
    required: false,
  })
  processingFee?: number;

  @ApiProperty({
    description: 'Net amount after fees in cents',
    example: 98680,
    required: false,
  })
  netAmount?: number;

  @ApiProperty({
    description: 'Failure reason if payment failed',
    example: 'insufficient_funds',
    required: false,
  })
  failureReason?: string;

  @ApiProperty({
    description: 'Additional payment metadata',
    example: { 
      campaignId: 'q1-promo',
      source: 'web-checkout',
      customerNote: 'Urgent processing required'
    },
    required: false,
  })
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'External Stripe payment intent ID',
    example: 'pi_12345',
    required: false,
  })
  stripePaymentIntentId?: string;

  @ApiProperty({
    description: 'External Stripe charge ID',
    example: 'ch_12345',
    required: false,
  })
  stripeChargeId?: string;

  @ApiProperty({
    description: 'Payment creation timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Payment last update timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'Organization details',
    required: false,
  })
  organization?: {
    id: string;
    name: string;
    slug: string;
  };

  @ApiProperty({
    description: 'Subscription details if payment is for a subscription',
    required: false,
  })
  subscription?: {
    id: string;
    planId: string;
    seatQuantity: number;
    status: string;
  };
}