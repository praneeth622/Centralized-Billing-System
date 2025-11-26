import { IsString, IsOptional, IsArray, IsObject, ValidateNested, IsNotEmpty, IsEmail, IsUrl } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { BaseDto } from '../../../shared/dto/base.dto';

export class ExternalOrgMappingDto extends BaseDto {
  @ApiProperty({
    description: 'External organization identifier',
    example: 'stripe_cus_12345',
  })
  @IsString()
  @IsNotEmpty()
  externalId: string;

  @ApiProperty({
    description: 'External system name',
    example: 'stripe',
  })
  @IsString()
  @IsNotEmpty()
  externalSystem: string;

  @ApiProperty({
    description: 'Additional mapping metadata',
    example: { accountType: 'premium', region: 'us' },
    required: false,
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class CreateOrganizationDto extends BaseDto {
  @ApiProperty({
    description: 'Organization name',
    example: 'Acme Corp',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Organization slug for URL-friendly identifier',
    example: 'acme-corp',
    required: false,
  })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiProperty({
    description: 'Organization description',
    example: 'Leading provider of enterprise solutions',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Organization website URL',
    example: 'https://acme.com',
    required: false,
  })
  @IsUrl()
  @IsOptional()
  website?: string;

  @ApiProperty({
    description: 'Organization logo URL',
    example: 'https://acme.com/logo.png',
    required: false,
  })
  @IsUrl()
  @IsOptional()
  logo?: string;

  @ApiProperty({
    description: 'Industry category',
    example: 'Technology',
    required: false,
  })
  @IsString()
  @IsOptional()
  industry?: string;

  @ApiProperty({
    description: 'Organization size category',
    example: 'enterprise',
    required: false,
  })
  @IsString()
  @IsOptional()
  size?: string;

  @ApiProperty({
    description: 'Primary contact email',
    example: 'contact@acme.com',
    required: false,
  })
  @IsEmail()
  @IsOptional()
  contactEmail?: string;

  @ApiProperty({
    description: 'Additional metadata as key-value pairs',
    example: { region: 'us-west-1', tier: 'enterprise' },
    required: false,
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'List of external organization IDs for mapping',
    example: [
      { externalId: 'stripe_cus_12345', externalSystem: 'stripe' },
      { externalId: 'sf_001234', externalSystem: 'salesforce' }
    ],
    required: false,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExternalOrgMappingDto)
  @IsOptional()
  externalMappings?: ExternalOrgMappingDto[];
}

export class UpdateOrganizationDto extends BaseDto {
  @ApiProperty({
    description: 'Organization name',
    example: 'Acme Corp Updated',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Organization slug for URL-friendly identifier',
    example: 'acme-corp-updated',
    required: false,
  })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiProperty({
    description: 'Organization description',
    example: 'Updated description for leading provider of enterprise solutions',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Organization website URL',
    example: 'https://acme-updated.com',
    required: false,
  })
  @IsUrl()
  @IsOptional()
  website?: string;

  @ApiProperty({
    description: 'Organization logo URL',
    example: 'https://acme-updated.com/logo.png',
    required: false,
  })
  @IsUrl()
  @IsOptional()
  logo?: string;

  @ApiProperty({
    description: 'Industry category',
    example: 'Technology & Software',
    required: false,
  })
  @IsString()
  @IsOptional()
  industry?: string;

  @ApiProperty({
    description: 'Organization size category',
    example: 'large-enterprise',
    required: false,
  })
  @IsString()
  @IsOptional()
  size?: string;

  @ApiProperty({
    description: 'Primary contact email',
    example: 'updated-contact@acme.com',
    required: false,
  })
  @IsEmail()
  @IsOptional()
  contactEmail?: string;

  @ApiProperty({
    description: 'Additional metadata as key-value pairs',
    example: { region: 'us-east-1', tier: 'enterprise-plus' },
    required: false,
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'Active status',
    example: true,
    required: false,
  })
  @IsOptional()
  isActive?: boolean;
}

export class OrganizationResponseDto extends BaseDto {
  @ApiProperty({
    description: 'Organization unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Organization name',
    example: 'Acme Corp',
  })
  name: string;

  @ApiProperty({
    description: 'Organization slug for URL-friendly identifier',
    example: 'acme-corp',
  })
  slug: string;

  @ApiProperty({
    description: 'Organization description',
    example: 'Leading provider of enterprise solutions',
    required: false,
  })
  description?: string;

  @ApiProperty({
    description: 'Organization website URL',
    example: 'https://acme.com',
    required: false,
  })
  website?: string;

  @ApiProperty({
    description: 'Organization logo URL',
    example: 'https://acme.com/logo.png',
    required: false,
  })
  logo?: string;

  @ApiProperty({
    description: 'Industry category',
    example: 'Technology',
    required: false,
  })
  industry?: string;

  @ApiProperty({
    description: 'Organization size category',
    example: 'enterprise',
    required: false,
  })
  size?: string;

  @ApiProperty({
    description: 'Primary contact email',
    example: 'contact@acme.com',
    required: false,
  })
  contactEmail?: string;

  @ApiProperty({
    description: 'Active status',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Additional metadata as key-value pairs',
    example: { region: 'us-west-1', tier: 'enterprise' },
    required: false,
  })
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'Organization creation timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Organization last update timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'List of external organization mappings',
    type: [ExternalOrgMappingDto],
    required: false,
  })
  externalMappings?: ExternalOrgMappingDto[];
}