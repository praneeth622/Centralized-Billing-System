import { IsNumber, IsOptional, IsString, IsEnum, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { BaseDto } from './base.dto';

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc'
}

export class PaginationDto extends BaseDto {
  @ApiProperty({
    description: 'Page number (1-based)',
    example: 1,
    minimum: 1,
    default: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Page must be a number' })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number = 1;

  @ApiProperty({
    description: 'Number of items per page',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Limit must be a number' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit must not exceed 100' })
  limit?: number = 20;

  @ApiProperty({
    description: 'Search query string',
    example: 'acme',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Field to sort by',
    example: 'createdAt',
    required: false,
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiProperty({
    description: 'Sort order',
    enum: SortOrder,
    example: SortOrder.DESC,
    default: SortOrder.DESC,
    required: false,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;
}

export class PaginationMetaDto extends BaseDto {
  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 20,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of items',
    example: 150,
  })
  total: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 8,
  })
  totalPages: number;

  @ApiProperty({
    description: 'Whether there is a previous page',
    example: false,
  })
  hasPrevious: boolean;

  @ApiProperty({
    description: 'Whether there is a next page',
    example: true,
  })
  hasNext: boolean;

  @ApiProperty({
    description: 'Number of the previous page',
    example: null,
    required: false,
  })
  previousPage?: number;

  @ApiProperty({
    description: 'Number of the next page',
    example: 2,
    required: false,
  })
  nextPage?: number;
}

export class PaginatedResponseDto<T> extends BaseDto {
  @ApiProperty({
    description: 'Array of items for current page',
    isArray: true,
  })
  data: T[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationMetaDto,
  })
  meta: PaginationMetaDto;

  constructor(data: T[], meta: PaginationMetaDto) {
    super();
    this.data = data;
    this.meta = meta;
  }
}

export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  CONFLICT = 'CONFLICT',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
  BAD_REQUEST = 'BAD_REQUEST'
}

export class ApiErrorDto extends BaseDto {
  @ApiProperty({
    description: 'HTTP status code',
    example: 400,
  })
  statusCode: number;

  @ApiProperty({
    description: 'Error type classification',
    enum: ErrorType,
    example: ErrorType.VALIDATION_ERROR,
  })
  type: ErrorType;

  @ApiProperty({
    description: 'Human-readable error message',
    example: 'Validation failed for request parameters',
  })
  message: string;

  @ApiProperty({
    description: 'Unique error code for tracking',
    example: 'BIL001',
    required: false,
  })
  code?: string;

  @ApiProperty({
    description: 'Detailed error information',
    example: ['name is required', 'email must be a valid email'],
    required: false,
  })
  details?: string[];

  @ApiProperty({
    description: 'Timestamp when error occurred',
    example: '2024-01-15T10:30:00.000Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Request path that caused the error',
    example: '/api/organizations',
    required: false,
  })
  path?: string;

  @ApiProperty({
    description: 'Correlation ID for tracking across services',
    example: 'req_123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  correlationId?: string;

  @ApiProperty({
    description: 'Additional error context',
    example: { field: 'email', rejectedValue: 'invalid-email' },
    required: false,
  })
  context?: Record<string, any>;
}

export class HealthCheckDto extends BaseDto {
  @ApiProperty({
    description: 'Service health status',
    example: 'healthy',
  })
  status: 'healthy' | 'degraded' | 'unhealthy';

  @ApiProperty({
    description: 'Service version',
    example: '1.0.0',
  })
  version: string;

  @ApiProperty({
    description: 'Environment name',
    example: 'production',
  })
  environment: string;

  @ApiProperty({
    description: 'Health check timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Uptime in milliseconds',
    example: 86400000,
  })
  uptime: number;

  @ApiProperty({
    description: 'Database connection status',
    example: 'connected',
  })
  database: 'connected' | 'disconnected' | 'error';

  @ApiProperty({
    description: 'External service dependencies status',
    example: { stripe: 'connected', clerk: 'connected' },
    required: false,
  })
  dependencies?: Record<string, 'connected' | 'disconnected' | 'error'>;
}