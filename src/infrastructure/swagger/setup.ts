/**
 * Swagger/OpenAPI Documentation Configuration
 * 
 * Provides comprehensive API documentation for the Centralized Billing System
 * with industry-standard OpenAPI 3.0 specifications for Express.js
 */

import swaggerUi from 'swagger-ui-express'
import swaggerJsdoc from 'swagger-jsdoc'
import { Express } from 'express'
import { writeFileSync } from 'fs'
import { join } from 'path'

/**
 * Configure Swagger documentation for the billing system
 */
export function setupSwagger(app: Express): void {
  // Define the OpenAPI specification
  const options: swaggerJsdoc.Options = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Centralized Billing System API',
        version: '1.0.0',
        description: `Centralized Billing System API — multi-tenant billing, subscriptions, payments, and analytics.`,
        
      },
      servers: [
        {
          url: 'http://localhost:3000',
          description: 'Development Server'
        }
      ],
      components: {
        securitySchemes: {
          BearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'Enter JWT token'
          }
        },
        schemas: {
          // Standard error response
          ErrorResponse: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'ERROR_CODE' },
              message: { type: 'string', example: 'Error description' },
              timestamp: { type: 'string', format: 'date-time' },
              path: { type: 'string', example: '/api/endpoint' }
            }
          },
          
          // Validation error response
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

          // Health check response
          HealthResponse: {
            type: 'object',
            properties: {
              status: { type: 'string', example: 'healthy' },
              timestamp: { type: 'string', format: 'date-time' },
              uptime: { type: 'number', example: 12345.67 },
              environment: { type: 'string', example: 'development' },
              version: { type: 'string', example: '1.0.0' },
              memory: {
                type: 'object',
                properties: {
                  rss: { type: 'number', example: 358252544 },
                  heapTotal: { type: 'number', example: 278396928 },
                  heapUsed: { type: 'number', example: 249656920 },
                  external: { type: 'number', example: 6753568 },
                  arrayBuffers: { type: 'number', example: 4130150 }
                }
              },
              cpu: {
                type: 'object',
                properties: {
                  user: { type: 'number', example: 123456 },
                  system: { type: 'number', example: 78910 }
                }
              }
            }
          },

          // Basic subscription response
          SubscriptionResponse: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', example: 'sub_123' },
                    customerId: { type: 'string', example: 'cus_123' },
                    priceId: { type: 'string', example: 'price_123' },
                    status: { type: 'string', example: 'active' },
                    createdAt: { type: 'string', format: 'date-time' }
                  }
                }
              }
            }
          },

          // Customer creation request
          CreateCustomerRequest: {
            type: 'object',
            required: ['email'],
            properties: {
              email: { 
                type: 'string', 
                format: 'email',
                example: 'customer@example.com',
                description: 'Customer email address'
              }
            }
          },

          // Subscription creation request
          CreateSubscriptionRequest: {
            type: 'object',
            required: ['customerId', 'priceId'],
            properties: {
              customerId: { 
                type: 'string',
                example: 'cus_123',
                description: 'Stripe customer ID'
              },
              priceId: { 
                type: 'string',
                example: 'price_123',
                description: 'Stripe price ID'
              }
            }
          },

          // Webhook payload
          StripeWebhookPayload: {
            type: 'object',
            properties: {
              type: { 
                type: 'string', 
                example: 'customer.subscription.created',
                description: 'Event type'
              },
              data: { 
                type: 'object',
                description: 'Event data object'
              }
            }
          }
        },
        responses: {
          UnauthorizedError: {
            description: 'Authentication information is missing or invalid',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'string', example: 'UNAUTHORIZED' },
                    message: { type: 'string', example: 'Authentication required' }
                  }
                }
              }
            }
          },
          ValidationError: {
            description: 'Input validation failed',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ValidationError'
                }
              }
            }
          }
        }
      },
      security: [
        {
          BearerAuth: []
        }
      ],
      tags: [
        { name: 'Health', description: 'System health and monitoring endpoints' },
        { name: 'Organizations', description: 'Organization management endpoints' },
        { name: 'Users', description: 'User management and authentication' },
        { name: 'Subscriptions', description: 'Subscription management endpoints' },
        { name: 'Payments', description: 'Payment processing and history' },
        { name: 'Webhooks', description: 'Webhook management and processing' },
        { name: 'Analytics', description: 'Revenue and usage analytics' }
      ]
    },
    apis: [
      './src/routes/*.ts',
      './src/controllers/*.ts',
      './src/webhooks/*.ts'
    ]
  }

  // Generate OpenAPI specification
  const specs = swaggerJsdoc(options)
  
  // Swagger UI options
  const swaggerUiOptions = {
    customSiteTitle: 'Billing System API Documentation',
    customCss: `
      .swagger-ui .topbar { display: none; }
      .swagger-ui .info .title { color: #2c3e50; }
      .swagger-ui .scheme-container { background: #f8f9fa; padding: 10px; }
      .swagger-ui .info .description p { font-size: 14px; line-height: 1.6; }
      .swagger-ui .info .description h2 { color: #34495e; margin-top: 20px; }
    `,
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'none',
      filter: true,
      showExtensions: true,
      tryItOutEnabled: true,
      defaultModelsExpandDepth: 2,
      defaultModelExpandDepth: 2,
    }
  }

  // Setup Swagger UI endpoint
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerUiOptions))
  
  // Serve raw OpenAPI spec as JSON
  app.get('/api/docs/json', (req, res) => {
    res.setHeader('Content-Type', 'application/json')
    res.send(specs)
  })

  // Generate OpenAPI JSON file for external tools
  const outputPath = join(process.cwd(), 'docs', 'openapi.json')
  try {
    const docsDir = join(process.cwd(), 'docs')
    const fs = require('fs')
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true })
    }
    writeFileSync(outputPath, JSON.stringify(specs, null, 2))
    console.log(`📄 OpenAPI spec generated: ${outputPath}`)
  } catch (error) {
    console.warn('⚠️  Could not write OpenAPI spec file:', error)
  }

  console.log(`📚 Swagger documentation available at: /api/docs`)
}

/**
 * Generate standalone OpenAPI specification object
 */
export function generateOpenApiSpec(): object {
  const options: swaggerJsdoc.Options = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Centralized Billing System API',
        description: 'Complete API specification for the centralized billing system',
        version: '1.0.0'
      }
    },
    apis: [
      './src/routes/*.ts',
      './src/controllers/*.ts',
      './src/webhooks/*.ts'
    ]
  }

  return swaggerJsdoc(options)
}

/**
 * JSDoc patterns for Express.js route documentation
 * 
 * Use these JSDoc comment patterns in your route files to automatically
 * generate OpenAPI documentation:
 * 
 * @example
 * ```typescript
 * // In your route file:
 * 
 * /**
 *  * @swagger
 *  * /api/health:
 *  *   get:
 *  *     tags: [Health]
 *  *     summary: Get system health status
 *  *     responses:
 *  *       200:
 *  *         description: Health check successful
 *  *         content:
 *  *           application/json:
 *  *             schema:
 *  *               $ref: '#/components/schemas/HealthResponse'
 *  *       503:
 *  *         description: Service unavailable
 *  *         content:
 *  *           application/json:
 *  *             schema:
 *  *               $ref: '#/components/schemas/ErrorResponse'
 *  * /
 * router.get('/health', (req, res) => { ... })
 * ```
 */

// Standard response helpers for JSDoc documentation
export const API_RESPONSES = {
  SUCCESS: '200: { description: "Success" }',
  CREATED: '201: { description: "Created successfully" }',
  BAD_REQUEST: '400: { description: "Bad request", content: { "application/json": { schema: { $ref: "#/components/schemas/ValidationError" } } } }',
  UNAUTHORIZED: '401: { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }',
  FORBIDDEN: '403: { description: "Forbidden", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }',
  NOT_FOUND: '404: { description: "Not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }',
  INTERNAL_ERROR: '500: { description: "Internal server error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }'
}

export const SECURITY_SCHEMES = {
  BEARER_AUTH: 'security: [{ BearerAuth: [] }]'
}