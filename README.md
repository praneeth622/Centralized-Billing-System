# 💳 Centralized Seat-Based Billing System

> **Enterprise-grade multi-tenant billing platform supporting multiple product applications with seat-based subscriptions, Stripe integration, and comprehensive analytics.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-blue.svg)](https://typescript.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.19.0-brightgreen.svg)](https://prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-336791.svg)](https://postgresql.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🏗️ Architecture Overview

This centralized billing system serves as the financial backbone for multiple product applications, enabling seat-based subscriptions with external organization ID mapping and real-time access control.

### Supported Applications
- **🏥 HealOS**: Healthcare management platform
- **📞 PowerDialer**: Sales automation and calling platform  
- **🎤 Openmic**: Communication and collaboration platform
- **💼 SalesRole**: CRM and sales management tools

### Core Features
- 🏢 **Multi-tenant architecture** with organization-based billing
- 💺 **Seat-based subscriptions** with real-time access verification
- 🔄 **External ID mapping** for product-specific organization identifiers
- 💳 **Stripe integration** for payment processing and subscription management
- 📊 **Comprehensive analytics** with MRR tracking and seat utilization
- 🔐 **Clerk authentication** with JWT-based API access
- 📋 **Audit logging** for complete action tracking
- 🔔 **Webhook integration** for real-time event processing

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 15+
- Stripe account (for payment processing)
- Clerk account (for authentication)

### Installation

1. **Clone and setup**
   ```bash
   git clone <repository-url>
   cd billing
   npm install
   ```

2. **Environment configuration**
   ```bash
   # Edit .env with your configuration
   ```

3. **Database setup**
   ```bash
   # Generate Prisma client
   npx prisma generate
   
   # Create migration (when database is available)
   # npx prisma migrate dev --name init
   ```

4. **Verify setup**
   ```bash
   # Validate schema
   npx prisma validate
   ```

## 🏗️ Database Schema

The system implements a comprehensive multi-tenant billing architecture with 15+ models:

### Core Entities
- **Organization**: Central billing entity (companies/hospitals)
- **User**: Individual people with role-based access
- **Application**: Product applications (HealOS, PowerDialer, etc.)
- **SubscriptionPlan**: Pricing tiers for each application
- **OrganizationSubscription**: Seat-based billing management
- **SubscriptionSeat**: Individual user access assignments
- **ExternalOrgMapping**: Product-specific organization ID mapping
- **Payment**: Financial transaction tracking
- **AuditLog**: Complete action audit trail
- **Analytics Tables**: MRR, seat usage, and revenue tracking

### Key Features
- **Seat-based access control** with real-time verification
- **External ID mapping** for multi-product integration
- **Stripe webhook integration** for payment automation
- **Comprehensive audit logging** for compliance
- **Performance-optimized indexes** for fast queries

## 🔧 Configuration

### Environment Variables

```bash
# Database
DATABASE_URL="postgresql://user:pass@host:5432/billing_db"
DB_MAX_CONNECTIONS=20
DB_CONNECTION_TIMEOUT=10000

# Stripe Integration
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_live_...

# Clerk Authentication
CLERK_SECRET_KEY=sk_live_...
CLERK_PUBLISHABLE_KEY=pk_live_...

# Application
NODE_ENV=production
PORT=3000
API_BASE_URL=https://billing-api.yourdomain.com

# Security
JWT_SECRET=your-secure-jwt-secret
ENCRYPTION_KEY=your-32-character-encryption-key

# Feature Flags
ENABLE_ANALYTICS=true
ENABLE_AUDIT_LOG=true
ENABLE_RATE_LIMITING=true
```

## 📡 API Documentation

### Core Endpoints

#### Seat Verification (Critical)
```http
POST /verify-seat
```
Verify if a user has access to a specific application.

**Request**:
```json
{
  "userId": "user_123",
  "applicationSlug": "healos",
  "externalOrgId": "hospital_456"
}
```

**Response**:
```json
{
  "hasAccess": true,
  "seatId": "seat_789",
  "subscriptionStatus": "ACTIVE",
  "expiresAt": "2024-02-01T00:00:00Z"
}
```

#### Organizations
```http
GET    /organizations              # List organizations
POST   /organizations              # Create organization
GET    /organizations/{id}         # Get organization details
PATCH  /organizations/{id}         # Update organization
```

#### Subscriptions
```http
GET    /subscriptions              # List subscriptions
POST   /subscriptions              # Create subscription
PATCH  /subscriptions/{id}         # Update subscription (change seats)
GET    /subscriptions/{id}/seats   # Get seat assignments
POST   /subscriptions/{id}/seats   # Assign seats
```

#### Analytics
```http
GET    /analytics/mrr              # Monthly recurring revenue
GET    /analytics/seat-usage       # Seat utilization metrics
GET    /analytics/revenue          # Revenue analytics
```

## 🧪 Development

### Project Structure
```
src/
├── modules/                    # Business domain modules
│   ├── organizations/          # Organization management
│   ├── subscriptions/          # Subscription lifecycle
│   ├── seats/                  # Seat assignment logic
│   ├── payments/               # Payment processing
│   ├── analytics/              # Metrics and reporting
│   └── webhooks/               # Event processing
├── shared/                     # Shared utilities
│   ├── dto/                    # Data transfer objects ✅
│   ├── validation/             # Input validation ✅
│   └── utils/                  # Helper functions
├── infrastructure/             # External integrations
│   ├── database/               # Prisma connection ✅
│   ├── stripe/                 # Payment processing
│   ├── clerk/                  # Authentication
│   └── swagger/                # API documentation ✅
└── main.ts                     # Application bootstrap
```

### Development Status

#### ✅ Completed
- **Database Schema**: Complete Prisma schema with 15+ models
- **Database Connection**: Optimized PostgreSQL connection with health monitoring
- **DTOs & Validation**: Comprehensive request/response objects with validation
- **Swagger Documentation**: Industry-standard API documentation
- **Environment Configuration**: Complete .env setup
- **Folder Structure**: Modular architecture following DDD principles

#### 🚧 Next Steps
- Database migration execution (requires live database)
- API controllers and business logic implementation
- Stripe integration and webhook handlers
- Clerk authentication middleware
- Analytics and reporting endpoints
- Testing suite and CI/CD pipeline

### Key Design Decisions

1. **External ID Mapping**: Supports product-specific organization identifiers
   - HealOS uses `hospital_id`
   - PowerDialer uses `company_id`
   - Mapped to central `organizationId`

2. **Seat-Based Access**: Real-time verification prevents unauthorized access
   - Users must have active seats to access applications
   - Seat assignments tracked with audit trail
   - Automatic access revocation on subscription changes

3. **Stripe Integration**: Complete payment lifecycle management
   - Single Stripe customer per organization
   - Multiple subscriptions per organization (one per application)
   - Webhook-driven subscription updates

4. **Analytics Ready**: Built-in reporting capabilities
   - MRR tracking with historical data
   - Seat utilization analytics
   - Revenue and churn analysis

## 📊 Business Logic

### Subscription Flow
1. **Organization Creation**: Admin creates organization with owner assignment
2. **Application Registration**: Each product app registers with billing system
3. **Plan Selection**: Organization chooses subscription plan for each app
4. **Seat Purchase**: Organization buys seats through Stripe checkout
5. **User Assignment**: Admins assign purchased seats to users
6. **Access Verification**: Applications verify user access in real-time
7. **Usage Analytics**: System tracks seat utilization and revenue

### Access Control Matrix
```
Role              | Create Org | Manage Billing | Assign Seats | Use Seats
------------------|------------|----------------|--------------|----------
OWNER            | ✅         | ✅             | ✅           | ✅
BILLING_ADMIN    | ❌         | ✅             | ✅           | ✅
ADMIN            | ❌         | ❌             | ✅           | ✅
MEMBER           | ❌         | ❌             | ❌           | ✅
```

## 🔐 Security & Compliance

### Authentication & Authorization
- **Clerk JWT tokens** for API access
- **Role-based permissions** at organization level
- **Seat-based access control** for applications
- **API rate limiting** to prevent abuse

### Data Protection
- **Input validation** with class-validator
- **SQL injection prevention** via Prisma ORM
- **Audit logging** for all critical actions
- **GDPR compliance** with data deletion capabilities

### Business Validation
- **Seat limit enforcement**: Cannot assign more seats than purchased
- **Subscription validation**: Active subscription required for seat assignment
- **Payment verification**: Real-time Stripe webhook processing
- **Organization isolation**: Complete multi-tenant data separation

## 📈 Analytics & Insights

### Revenue Metrics
- **Monthly Recurring Revenue (MRR)** with growth tracking
- **Average Revenue Per User (ARPU)** across applications
- **Subscription lifecycle analysis** with churn prediction
- **Payment success rates** and failure analysis

### Usage Metrics
- **Seat utilization rates** by organization and application
- **User activity tracking** for engagement analysis
- **Feature adoption metrics** across product suite
- **Organization health scores** for customer success

## 🚀 Next Implementation Steps

1. **Database Migration**
   ```bash
   # When PostgreSQL database is available
   npx prisma migrate dev --name init
   ```

2. **API Controllers** (Priority Order)
   - Seat verification endpoint (critical for product access)
   - Organization management
   - Subscription lifecycle management
   - Webhook processing (Stripe events)

3. **External Integrations**
   - Stripe payment processing
   - Clerk authentication middleware
   - Product application webhooks

4. **Testing & Deployment**
   - Unit and integration tests
   - CI/CD pipeline setup
   - Production deployment configuration

## 📞 Support & Contact

- **Documentation**: Available at `/api/docs` when running
- **Issues**: Report via GitHub Issues
- **Email**: engineering@attackcapital.com

---

**Built with ❤️ by the Attack Capital Engineering Team**

*This system powers the billing infrastructure for HealOS, PowerDialer, Openmic, and SalesRole applications.*