import { ApiProperty } from '@nestjs/swagger';

/**
 * Base DTO class with common validation configuration
 * All DTOs should extend this class for consistent behavior
 */
export abstract class BaseDto {
  /**
   * Base constructor that ensures all validation decorators are properly configured
   */
  constructor() {
    // Empty constructor for proper inheritance
  }
}

/**
 * Base DTO for entities with ID and timestamps
 */
export abstract class BaseEntityDto extends BaseDto {
  @ApiProperty({
    description: 'Unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  updatedAt: Date;
}