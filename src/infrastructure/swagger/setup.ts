/**
 * Swagger/OpenAPI Documentation Configuration
 * 
 * Provides comprehensive API documentation for the Centralized Billing System
 * with industry-standard OpenAPI 3.0 specifications.
 */

import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { INestApplication } from '@nestjs/common'
import { writeFileSync } from 'fs'
import { join } from 'path'

/**
 * Configure Swagger documentation for the billing system
 */
export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Centralized Billing System API')
    .setDescription(`
# Centralized Seat-Based Billing System

A comprehensive multi-tenant billing platform supporting:

## 🏢 Multi-Product Architecture
- **HealOS**: Healthcare management system
- **PowerDialer**: Sales automation platform  
- **Openmic**: Communication platform
- **SalesRole**: CRM and sales tools

## 💳 Billing Features
- **Seat-based subscriptions**: Pay per user model
- **Stripe integration**: Complete payment processing
- **External ID mapping**: Support for product-specific organization identifiers
- **Real-time seat verification**: Instant access control
- **Comprehensive analytics**: Revenue, usage, and churn metrics

## 🔐 Security & Authentication
- **Clerk integration**: Secure user authentication
- **JWT-based API access**: Stateless authentication
- **Role-based permissions**: Organization, admin, billing, and member roles
- **Audit logging**: Complete action tracking

## 📊 Analytics & Reporting
- **MRR tracking**: Monthly recurring revenue analytics
- **Seat utilization**: Daily usage metrics
- **Payment history**: Complete financial tracking
- **Churn analysis**: Subscription lifecycle metrics

## 🔄 Webhook Integration
- **Stripe webhooks**: Real-time payment notifications
- **Product webhooks**: Notify external systems of seat changes
- **Idempotent processing**: Reliable event handling

## 🏗️ Enterprise Ready
- **Database connection pooling**: Optimized PostgreSQL performance
- **Error handling**: Comprehensive error responses
- **Rate limiting**: API protection
- **Input validation**: Request/response validation with class-validator
`)
    .setVersion('1.0.0')
    .setContact(
      'Engineering Team',
      'https://github.com/attack-capital',
      'engineering@attackcapital.com'
    )
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addServer('http://localhost:3000', 'Development Server')
    .addServer('https://billing-api.attackcapital.com', 'Production Server')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth'
    )
    .addSecurityRequirements('JWT-auth')
    .addTag('Organizations', 'Organization management endpoints')
    .addTag('Users', 'User management and authentication')
    .addTag('Applications', 'Product application configuration')
    .addTag('Subscription Plans', 'Pricing plan management')
    .addTag('Subscriptions', 'Organization subscription management')
    .addTag('Seats', 'Seat assignment and access control')
    .addTag('Payments', 'Payment processing and history')
    .addTag('External Mappings', 'Product-specific organization ID mapping')
    .addTag('Webhooks', 'Webhook management and processing')
    .addTag('Analytics', 'Revenue and usage analytics')
    .addTag('Health', 'System health and monitoring')
    .build()

  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (controllerKey: string, methodKey: string) =>
      `${controllerKey.replace('Controller', '')}_${methodKey}`,
  })

  // Add custom schema components
  document.components = {
    ...document.components,
    schemas: {
      ...document.components?.schemas,
      
      // Custom error responses
      ValidationError: {
        type: 'object',
        properties: {
          code: { type: 'string', example: 'VALIDATION_ERROR' },
          message: { type: 'string', example: 'Input validation failed' },
          details: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string', example: 'email' },
                message: { type: 'string', example: 'Invalid email format' }
              }
            }
          },
          timestamp: { type: 'string', format: 'date-time' },
          path: { type: 'string', example: '/api/organizations' }
        }
      },

      // Seat verification response
      SeatVerificationResponse: {
        type: 'object',
        properties: {
          hasAccess: { type: 'boolean', example: true },
          seatId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
          subscriptionStatus: { type: 'string', enum: ['ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELED'] },
          organizationId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
          applicationId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
          expiresAt: { type: 'string', format: 'date-time' }
        }
      },

      // Webhook payload schemas
      StripeWebhookPayload: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'evt_123abc' },
          type: { type: 'string', example: 'invoice.payment_succeeded' },
          data: { type: 'object' },
          created: { type: 'integer', example: 1640995200 }
        }
      },

      // Subscription usage summary
      SubscriptionUsageSummary: {
        type: 'object',
        properties: {
          subscriptionId: { type: 'string' },
          totalSeats: { type: 'integer', example: 10 },
          usedSeats: { type: 'integer', example: 8 },
          availableSeats: { type: 'integer', example: 2 },
          utilizationRate: { type: 'number', format: 'float', example: 0.8 },
          lastActivity: { type: 'string', format: 'date-time' }
        }
      }
    }
  }

  // Add examples for common responses
  document.components.examples = {
    OrganizationExample: {
      summary: 'Hospital organization',
      value: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'General Hospital',
        slug: 'general-hospital',
        ownerUserId: '123e4567-e89b-12d3-a456-426614174001',
        billingEmail: 'billing@generalhospital.com',
        stripeCustomerId: 'cus_123abc',
        status: 'ACTIVE',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z'
      }
    },
    
    SubscriptionExample: {
      summary: 'HealOS subscription',
      value: {
        id: '123e4567-e89b-12d3-a456-426614174002',
        organizationId: '123e4567-e89b-12d3-a456-426614174000',
        applicationId: '123e4567-e89b-12d3-a456-426614174003',
        subscriptionPlanId: '123e4567-e89b-12d3-a456-426614174004',
        quantity: 25,
        status: 'ACTIVE',
        currentPeriodStart: '2023-01-01T00:00:00Z',
        currentPeriodEnd: '2023-02-01T00:00:00Z'
      }
    }
  }

  // Setup Swagger UI
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'none',
      filter: true,
      showExtensions: true,
      tryItOutEnabled: true,
      defaultModelsExpandDepth: 2,
      defaultModelExpandDepth: 2,
    },
    customSiteTitle: 'Billing System API Documentation',
    customfavIcon: '/favicon.ico',
    customCss: `
      .swagger-ui .topbar { display: none; }
      .swagger-ui .info .title { color: #2c3e50; }
      .swagger-ui .scheme-container { background: #f8f9fa; padding: 10px; }
      .swagger-ui .info .description p { font-size: 14px; line-height: 1.6; }
      .swagger-ui .info .description h2 { color: #34495e; margin-top: 20px; }
    `,
  })

  // Generate OpenAPI JSON file for external tools
  const outputPath = join(process.cwd(), 'docs', 'openapi.json')
  try {
    writeFileSync(outputPath, JSON.stringify(document, null, 2))
    console.log(`📄 OpenAPI spec generated: ${outputPath}`)
  } catch (error) {
    console.warn('⚠️  Could not write OpenAPI spec file:', error)
  }
}

/**
 * Generate standalone OpenAPI specification file
 */
export function generateOpenApiSpec(app: INestApplication): object {
  const config = new DocumentBuilder()
    .setTitle('Centralized Billing System API')
    .setDescription('Complete API specification for the centralized billing system')
    .setVersion('1.0.0')
    .build()

  return SwaggerModule.createDocument(app, config)
}

/**
 * Custom API response decorators for common responses
 */
import { applyDecorators } from '@nestjs/common'
import { 
  ApiResponse, 
  ApiOperation,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiInternalServerErrorResponse
} from '@nestjs/swagger'

export const ApiStandardResponses = () => applyDecorators(
  ApiBadRequestResponse({
    description: 'Bad request - Invalid input data',
    schema: { $ref: '#/components/schemas/ValidationError' }
  }),
  ApiUnauthorizedResponse({
    description: 'Unauthorized - Authentication required',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'UNAUTHORIZED' },
        message: { type: 'string', example: 'Authentication token required' }
      }
    }
  }),
  ApiForbiddenResponse({
    description: 'Forbidden - Insufficient permissions',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'FORBIDDEN' },
        message: { type: 'string', example: 'Insufficient permissions' }
      }
    }
  }),
  ApiInternalServerErrorResponse({
    description: 'Internal server error',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'INTERNAL_ERROR' },
        message: { type: 'string', example: 'An unexpected error occurred' }
      }
    }
  })
)

export const ApiEntityNotFoundResponse = (entityName: string) => 
  ApiNotFoundResponse({
    description: `${entityName} not found`,
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'NOT_FOUND' },
        message: { type: 'string', example: `${entityName} not found` }
      }
    }
  })

export const ApiCreatedResponse = (description: string, type?: any) =>
  ApiResponse({
    status: 201,
    description,
    type
  })

export const ApiSuccessResponse = (description: string, type?: any) =>
  ApiResponse({
    status: 200,
    description,
    type
  })