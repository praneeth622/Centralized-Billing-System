import { IsString, IsOptional, IsEnum, IsObject, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BaseDto } from '../../../shared/dto/base.dto';
import { SeatStatus } from '@prisma/client';

export class AssignSeatDto extends BaseDto {
  @ApiProperty({
    description: 'Subscription ID to assign seat from',
    example: '123e4567-e89b-12d3-a456-426614174004',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  subscriptionId: string;

  @ApiProperty({
    description: 'User ID to assign the seat to',
    example: '123e4567-e89b-12d3-a456-426614174001',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: 'Seat assignment status',
    enum: SeatStatus,
    example: SeatStatus.ACTIVE,
    required: false,
  })
  @IsEnum(SeatStatus)
  @IsOptional()
  status?: SeatStatus;

  @ApiProperty({
    description: 'Assignment start date (ISO string)',
    example: '2024-01-15T00:00:00.000Z',
    required: false,
  })
  @IsOptional()
  assignedAt?: Date;

  @ApiProperty({
    description: 'Assignment expiry date (ISO string)',
    example: '2024-12-31T23:59:59.999Z',
    required: false,
  })
  @IsOptional()
  expiresAt?: Date;

  @ApiProperty({
    description: 'Additional seat metadata',
    example: { 
      department: 'Engineering',
      role: 'Developer',
      accessLevel: 'standard'
    },
    required: false,
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateSeatDto extends BaseDto {
  @ApiProperty({
    description: 'Seat assignment status',
    enum: SeatStatus,
    example: SeatStatus.REMOVED,
    required: false,
  })
  @IsEnum(SeatStatus)
  @IsOptional()
  status?: SeatStatus;

  @ApiProperty({
    description: 'Assignment expiry date (ISO string)',
    example: '2024-12-31T23:59:59.999Z',
    required: false,
  })
  @IsOptional()
  expiresAt?: Date;

  @ApiProperty({
    description: 'Reason for seat status change',
    example: 'User temporarily suspended',
    required: false,
  })
  @IsString()
  @IsOptional()
  statusReason?: string;

  @ApiProperty({
    description: 'Additional seat metadata',
    example: { 
      department: 'Engineering',
      role: 'Senior Developer',
      accessLevel: 'elevated'
    },
    required: false,
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class SeatResponseDto extends BaseDto {
  @ApiProperty({
    description: 'Seat unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174005',
  })
  id: string;

  @ApiProperty({
    description: 'Subscription ID this seat belongs to',
    example: '123e4567-e89b-12d3-a456-426614174004',
  })
  subscriptionId: string;

  @ApiProperty({
    description: 'User ID assigned to this seat',
    example: '123e4567-e89b-12d3-a456-426614174001',
    required: false,
  })
  userId?: string;

  @ApiProperty({
    description: 'Seat assignment status',
    enum: SeatStatus,
    example: SeatStatus.ACTIVE,
  })
  status: SeatStatus;

  @ApiProperty({
    description: 'Assignment start date',
    example: '2024-01-15T00:00:00.000Z',
    required: false,
  })
  assignedAt?: Date;

  @ApiProperty({
    description: 'Assignment expiry date',
    example: '2024-12-31T23:59:59.999Z',
    required: false,
  })
  expiresAt?: Date;

  @ApiProperty({
    description: 'Last activity timestamp',
    example: '2024-01-20T14:30:00.000Z',
    required: false,
  })
  lastActivityAt?: Date;

  @ApiProperty({
    description: 'Reason for current seat status',
    example: 'Active user',
    required: false,
  })
  statusReason?: string;

  @ApiProperty({
    description: 'Additional seat metadata',
    example: { 
      department: 'Engineering',
      role: 'Developer',
      accessLevel: 'standard'
    },
    required: false,
  })
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'Seat creation timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Seat last update timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'User details if seat is assigned',
    required: false,
  })
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    fullName: string;
  };

  @ApiProperty({
    description: 'Subscription details',
    required: false,
  })
  subscription?: {
    id: string;
    organizationId: string;
    planId: string;
    status: string;
  };
}