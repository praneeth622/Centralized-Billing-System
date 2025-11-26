/**
 * Validation Utilities for the Centralized Billing System
 * 
 * Provides comprehensive validation helpers, custom validators,
 * and error handling for API requests and database operations.
 */

import { 
  ValidationPipe, 
  BadRequestException,
  ValidationError as NestValidationError
} from '@nestjs/common'
import { 
  validate, 
  ValidationError,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface
} from 'class-validator'
import { plainToClass, Transform } from 'class-transformer'

// ============================================
// CUSTOM VALIDATION DECORATORS
// ============================================

/**
 * Custom validator for Stripe IDs
 */
@ValidatorConstraint({ name: 'isStripeId', async: false })
export class IsStripeIdConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    if (typeof value !== 'string') return false
    
    const { prefix } = args.constraints[0] || {}
    if (prefix) {
      return value.startsWith(prefix) && value.length > prefix.length + 1
    }
    
    // General Stripe ID pattern: starts with known prefix followed by underscore
    const stripeIdPattern = /^(cus_|sub_|pi_|pm_|src_|card_|ba_|price_|prod_|plan_|inv_|evt_|ch_|re_|txn_|acct_|fee_|sku_|order_)/
    return stripeIdPattern.test(value)
  }

  defaultMessage(args: ValidationArguments) {
    const { prefix } = args.constraints[0] || {}
    return prefix 
      ? `${args.property} must be a valid Stripe ID starting with ${prefix}`
      : `${args.property} must be a valid Stripe ID`
  }
}

export function IsStripeId(options?: { prefix?: string }, validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [options],
      validator: IsStripeIdConstraint,
    })
  }
}

/**
 * Custom validator for organization slugs
 */
@ValidatorConstraint({ name: 'isValidSlug', async: false })
export class IsValidSlugConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    if (typeof value !== 'string') return false
    
    // Slug should be lowercase, contain only letters, numbers, and hyphens
    // Must not start or end with hyphen, and no consecutive hyphens
    const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
    return slugPattern.test(value) && value.length >= 2 && value.length <= 50
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} must be a valid slug (lowercase letters, numbers, hyphens only, 2-50 characters)`
  }
}

export function IsValidSlug(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidSlugConstraint,
    })
  }
}

/**
 * Custom validator for seat quantity limits
 */
@ValidatorConstraint({ name: 'isValidSeatQuantity', async: false })
export class IsValidSeatQuantityConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    if (typeof value !== 'number') return false
    
    // Seat quantity should be positive integer, reasonable upper limit
    return Number.isInteger(value) && value >= 1 && value <= 10000
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} must be a valid seat quantity (1-10,000)`
  }
}

export function IsValidSeatQuantity(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidSeatQuantityConstraint,
    })
  }
}

// ============================================
// TRANSFORMATION HELPERS
// ============================================

/**
 * Transform string to lowercase for slugs
 */
export const ToLowercase = () => Transform(({ value }) => 
  typeof value === 'string' ? value.toLowerCase() : value
)

/**
 * Transform string to proper case for names
 */
export const ToProperCase = () => Transform(({ value }) => 
  typeof value === 'string' 
    ? value.replace(/\w\S*/g, (txt) => 
        txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
      )
    : value
)

/**
 * Sanitize HTML input
 */
export const SanitizeHtml = () => Transform(({ value }) => {
  if (typeof value !== 'string') return value
  
  // Basic HTML sanitization - remove script tags and potential XSS vectors
  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()
})

/**
 * Parse and validate JSON fields
 */
export const ParseJSON = () => Transform(({ value }) => {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch {
      throw new BadRequestException('Invalid JSON format')
    }
  }
  return value
})

// ============================================
// VALIDATION PIPES AND CONFIGURATION
// ============================================

/**
 * Custom validation pipe with enhanced error formatting
 */
export class CustomValidationPipe extends ValidationPipe {
  constructor() {
    super({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      disableErrorMessages: false,
      validationError: {
        target: false,
        value: false,
      },
      exceptionFactory: (errors: NestValidationError[]) => {
        const formattedErrors = this.formatValidationErrors(errors)
        return new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: 'Input validation failed',
          details: formattedErrors,
          timestamp: new Date().toISOString(),
        })
      },
    })
  }

  private formatValidationErrors(errors: NestValidationError[]): any[] {
    return errors.map(error => ({
      field: error.property,
      message: Object.values(error.constraints || {}).join(', '),
      value: error.value,
      children: error.children && error.children.length > 0 
        ? this.formatValidationErrors(error.children)
        : undefined,
    }))
  }
}

// ============================================
// BUSINESS RULE VALIDATORS
// ============================================

/**
 * Business rule validation utilities
 */
export class BusinessRuleValidator {
  /**
   * Validate subscription plan compatibility
   */
  static validateSubscriptionPlan(planData: {
    minSeats: number
    maxSeats?: number
    pricePerSeat: number
    trialPeriodDays: number
  }): string[] {
    const errors: string[] = []

    if (planData.minSeats < 1) {
      errors.push('Minimum seats must be at least 1')
    }

    if (planData.maxSeats && planData.maxSeats < planData.minSeats) {
      errors.push('Maximum seats cannot be less than minimum seats')
    }

    if (planData.pricePerSeat < 0) {
      errors.push('Price per seat cannot be negative')
    }

    if (planData.pricePerSeat > 10000) {
      errors.push('Price per seat cannot exceed $10,000')
    }

    if (planData.trialPeriodDays < 0 || planData.trialPeriodDays > 365) {
      errors.push('Trial period must be between 0 and 365 days')
    }

    return errors
  }

  /**
   * Validate seat assignment rules
   */
  static validateSeatAssignment(data: {
    totalSeats: number
    usedSeats: number
    newAssignments: number
  }): string[] {
    const errors: string[] = []

    if (data.usedSeats + data.newAssignments > data.totalSeats) {
      errors.push(`Cannot assign ${data.newAssignments} seats. Only ${data.totalSeats - data.usedSeats} seats available.`)
    }

    if (data.newAssignments < 1) {
      errors.push('Must assign at least 1 seat')
    }

    return errors
  }

  /**
   * Validate organization data
   */
  static validateOrganization(data: {
    name: string
    slug: string
    billingEmail: string
  }): string[] {
    const errors: string[] = []

    // Reserved slugs that cannot be used
    const reservedSlugs = [
      'admin', 'api', 'www', 'mail', 'ftp', 'localhost', 'staging', 'test',
      'billing', 'payment', 'stripe', 'webhook', 'callback', 'auth', 'login'
    ]

    if (reservedSlugs.includes(data.slug.toLowerCase())) {
      errors.push(`The slug '${data.slug}' is reserved and cannot be used`)
    }

    // Validate business email format (not personal email domains)
    const personalDomains = [
      'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com',
      'icloud.com', 'protonmail.com', 'mailbox.org'
    ]
    
    const emailDomain = data.billingEmail.split('@')[1]?.toLowerCase()
    if (personalDomains.includes(emailDomain)) {
      errors.push('Business email address required (personal email domains not allowed)')
    }

    return errors
  }
}

// ============================================
// DTO VALIDATION HELPERS
// ============================================

/**
 * Validate DTO against class with custom error handling
 */
export async function validateDto<T extends object>(
  dtoClass: new () => T,
  data: any
): Promise<{ isValid: boolean; errors: string[]; dto?: T }> {
  try {
    const dto = plainToClass(dtoClass, data)
    const errors = await validate(dto)

    if (errors.length > 0) {
      const errorMessages = errors.map(error => 
        Object.values(error.constraints || {}).join(', ')
      )
      return { isValid: false, errors: errorMessages }
    }

    return { isValid: true, errors: [], dto }
  } catch (error) {
    return { 
      isValid: false, 
      errors: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`] 
    }
  }
}

/**
 * Batch validation for multiple DTOs
 */
export async function validateDtoBatch<T extends object>(
  dtoClass: new () => T,
  dataArray: any[]
): Promise<{
  isValid: boolean
  validDtos: T[]
  errors: Array<{ index: number; errors: string[] }>
}> {
  const validDtos: T[] = []
  const errors: Array<{ index: number; errors: string[] }> = []

  for (let i = 0; i < dataArray.length; i++) {
    const result = await validateDto(dtoClass, dataArray[i])
    
    if (result.isValid && result.dto) {
      validDtos.push(result.dto)
    } else {
      errors.push({ index: i, errors: result.errors })
    }
  }

  return {
    isValid: errors.length === 0,
    validDtos,
    errors
  }
}

// ============================================
// SANITIZATION UTILITIES
// ============================================

/**
 * Sanitize user input for security
 */
export class InputSanitizer {
  /**
   * Remove potentially dangerous characters from strings
   */
  static sanitizeString(input: string): string {
    if (typeof input !== 'string') return ''
    
    return input
      .replace(/[<>\"'%;()&+]/g, '') // Remove dangerous chars
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
  }

  /**
   * Sanitize organization name
   */
  static sanitizeOrganizationName(name: string): string {
    return this.sanitizeString(name)
      .replace(/[^\w\s\-&.]/g, '') // Only allow word chars, spaces, hyphens, ampersand, period
      .substring(0, 100) // Limit length
  }

  /**
   * Sanitize slug
   */
  static sanitizeSlug(slug: string): string {
    return slug
      .toLowerCase()
      .replace(/[^a-z0-9\-]/g, '') // Only lowercase letters, numbers, hyphens
      .replace(/-+/g, '-') // Remove consecutive hyphens
      .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
      .substring(0, 50) // Limit length
  }

  /**
   * Validate and sanitize JSON input
   */
  static sanitizeJson(input: any): any {
    if (input === null || input === undefined) return null
    
    try {
      // If it's already an object, validate it doesn't contain functions
      if (typeof input === 'object') {
        return JSON.parse(JSON.stringify(input)) // Deep clone and remove functions
      }
      
      // If it's a string, try to parse it
      if (typeof input === 'string') {
        return JSON.parse(input)
      }
      
      return null
    } catch {
      return null
    }
  }
}