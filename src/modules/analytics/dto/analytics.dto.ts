import { IsString, IsOptional, IsDateString, IsEnum, IsArray, ValidateNested, IsNumber, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { BaseDto } from '../../../shared/dto/base.dto';

export enum TimeRange {
  LAST_7_DAYS = 'last_7_days',
  LAST_30_DAYS = 'last_30_days',
  LAST_90_DAYS = 'last_90_days',
  LAST_12_MONTHS = 'last_12_months',
  YEAR_TO_DATE = 'year_to_date',
  CUSTOM = 'custom'
}

export enum MetricType {
  MRR = 'mrr',
  ARR = 'arr',
  CHURN_RATE = 'churn_rate',
  CUSTOMER_COUNT = 'customer_count',
  SEAT_UTILIZATION = 'seat_utilization',
  REVENUE_PER_CUSTOMER = 'revenue_per_customer'
}

export class AnalyticsQueryDto extends BaseDto {
  @ApiProperty({
    description: 'Time range for analytics data',
    enum: TimeRange,
    example: TimeRange.LAST_30_DAYS,
    required: false,
  })
  @IsEnum(TimeRange)
  @IsOptional()
  timeRange?: TimeRange;

  @ApiProperty({
    description: 'Start date for custom time range (ISO string)',
    example: '2024-01-01T00:00:00.000Z',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({
    description: 'End date for custom time range (ISO string)',
    example: '2024-01-31T23:59:59.999Z',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiProperty({
    description: 'Specific metric types to include',
    enum: MetricType,
    isArray: true,
    example: [MetricType.MRR, MetricType.CUSTOMER_COUNT],
    required: false,
  })
  @IsArray()
  @IsEnum(MetricType, { each: true })
  @IsOptional()
  metrics?: MetricType[];

  @ApiProperty({
    description: 'Filter by specific organization IDs',
    example: ['123e4567-e89b-12d3-a456-426614174000'],
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  organizationIds?: string[];

  @ApiProperty({
    description: 'Filter by specific application IDs',
    example: ['123e4567-e89b-12d3-a456-426614174002'],
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  applicationIds?: string[];

  @ApiProperty({
    description: 'Group results by time period (day, week, month, quarter)',
    example: 'month',
    required: false,
  })
  @IsString()
  @IsOptional()
  groupBy?: string;

  @ApiProperty({
    description: 'Include detailed breakdown by application',
    example: true,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeApplicationBreakdown?: boolean;

  @ApiProperty({
    description: 'Include organization-level details',
    example: false,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeOrganizationDetails?: boolean;

  @ApiProperty({
    description: 'Currency for financial metrics (ISO 4217)',
    example: 'USD',
    required: false,
  })
  @IsString()
  @IsOptional()
  currency?: string;
}

export class MRRAnalyticsDto extends BaseDto {
  @ApiProperty({
    description: 'Date for this MRR data point',
    example: '2024-01-31',
  })
  date: string;

  @ApiProperty({
    description: 'Monthly Recurring Revenue in cents',
    example: 1250000,
  })
  mrr: number;

  @ApiProperty({
    description: 'New MRR from new customers in cents',
    example: 99000,
  })
  newMrr: number;

  @ApiProperty({
    description: 'Expansion MRR from existing customers in cents',
    example: 15000,
  })
  expansionMrr: number;

  @ApiProperty({
    description: 'Contraction MRR from downgrades in cents',
    example: 5000,
  })
  contractionMrr: number;

  @ApiProperty({
    description: 'Churned MRR from cancelled customers in cents',
    example: 12000,
  })
  churnedMrr: number;

  @ApiProperty({
    description: 'Net new MRR (new + expansion - contraction - churned) in cents',
    example: 97000,
  })
  netNewMrr: number;

  @ApiProperty({
    description: 'Total number of paying customers',
    example: 125,
  })
  customerCount: number;

  @ApiProperty({
    description: 'Average revenue per user in cents',
    example: 10000,
  })
  arpu: number;

  @ApiProperty({
    description: 'MRR growth rate as decimal (0.1 = 10% growth)',
    example: 0.084,
  })
  growthRate: number;

  @ApiProperty({
    description: 'Customer churn rate as decimal (0.05 = 5% churn)',
    example: 0.024,
  })
  churnRate: number;
}

export class ApplicationAnalyticsDto extends BaseDto {
  @ApiProperty({
    description: 'Application ID',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  applicationId: string;

  @ApiProperty({
    description: 'Application name',
    example: 'HealOS',
  })
  applicationName: string;

  @ApiProperty({
    description: 'Total MRR for this application in cents',
    example: 750000,
  })
  mrr: number;

  @ApiProperty({
    description: 'Number of active subscriptions',
    example: 75,
  })
  activeSubscriptions: number;

  @ApiProperty({
    description: 'Total seat count across all subscriptions',
    example: 450,
  })
  totalSeats: number;

  @ApiProperty({
    description: 'Number of assigned seats',
    example: 380,
  })
  assignedSeats: number;

  @ApiProperty({
    description: 'Seat utilization rate as decimal (0.84 = 84%)',
    example: 0.844,
  })
  utilizationRate: number;

  @ApiProperty({
    description: 'Average seats per organization',
    example: 6.0,
  })
  avgSeatsPerOrganization: number;
}

export class AnalyticsResponseDto extends BaseDto {
  @ApiProperty({
    description: 'Query parameters used for this analytics response',
    type: AnalyticsQueryDto,
  })
  query: AnalyticsQueryDto;

  @ApiProperty({
    description: 'Overall summary metrics',
  })
  summary: {
    totalMrr: number;
    totalCustomers: number;
    totalSeats: number;
    overallGrowthRate: number;
    overallChurnRate: number;
  };

  @ApiProperty({
    description: 'Time series MRR data',
    type: [MRRAnalyticsDto],
    required: false,
  })
  mrrData?: MRRAnalyticsDto[];

  @ApiProperty({
    description: 'Application-specific analytics breakdown',
    type: [ApplicationAnalyticsDto],
    required: false,
  })
  applicationBreakdown?: ApplicationAnalyticsDto[];

  @ApiProperty({
    description: 'Currency used for all financial metrics',
    example: 'USD',
  })
  currency: string;

  @ApiProperty({
    description: 'Timestamp when this analytics data was generated',
    example: '2024-01-15T10:30:00.000Z',
  })
  generatedAt: Date;

  @ApiProperty({
    description: 'Data freshness indicator (how recent the underlying data is)',
    example: '2024-01-15T09:00:00.000Z',
  })
  dataAsOf: Date;
}

export class RevenueForecastDto extends BaseDto {
  @ApiProperty({
    description: 'Forecast date',
    example: '2024-02-29',
  })
  date: string;

  @ApiProperty({
    description: 'Predicted MRR in cents',
    example: 1350000,
  })
  predictedMrr: number;

  @ApiProperty({
    description: 'Confidence interval lower bound in cents',
    example: 1275000,
  })
  confidenceLower: number;

  @ApiProperty({
    description: 'Confidence interval upper bound in cents',
    example: 1425000,
  })
  confidenceUpper: number;

  @ApiProperty({
    description: 'Confidence level as decimal (0.95 = 95% confidence)',
    example: 0.95,
  })
  confidenceLevel: number;
}