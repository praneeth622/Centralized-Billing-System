# 🏗️ **CENTRALIZED SEAT-BASED BILLING SYSTEM**
## **Complete Architecture & Planning Document**

---

## 📋 **TABLE OF CONTENTS**

1. [System Overview](#1-system-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Database Schema](#4-database-schema)
5. [Business Logic](#5-business-logic)
6. [API Endpoints](#6-api-endpoints)
7. [Stripe Integration](#7-stripe-integration)
8. [Webhook Handlers](#8-webhook-handlers)
9. [Access Control](#9-access-control)
10. [Event-Driven Architecture](#10-event-driven-architecture)
11. [Monitoring & Analytics](#11-monitoring--analytics)
12. [Configuration](#12-configuration)
13. [Implementation Roadmap](#13-implementation-roadmap)

---

## **1. SYSTEM OVERVIEW**

### **Architecture Type:**
- **Microservice Architecture** (Modular Monolith - Ready for Microservices)
- **Multi-Tenant** (Organization-level isolation)
- **Per-Product Seat-Based Subscriptions**

### **Key Concepts:**

```
┌─────────────────────────────────────────────────────────────┐
│                    ORGANIZATION (Acme Corp)                  │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   HealOS     │  │ PowerDialer  │  │   Openmic    │     │
│  │ Subscription │  │ Subscription │  │ Subscription │     │
│  │  5 seats     │  │  3 seats     │  │  10 seats    │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                 │                 │               │
│    ┌────┴────┐       ┌───┴────┐       ┌────┴─────┐        │
│    │ User A  │       │ User A │       │  User B  │        │
│    │ User B  │       │ User C │       │  User D  │        │
│    │ User C  │       │        │       │  User E  │        │
│    └─────────┘       └────────┘       │  ...     │        │
│                                        └──────────┘        │
│                                                             │
│  Same user can have seats in multiple products             │
│  Each product tracks its own seat assignments              │
└─────────────────────────────────────────────────────────────┘
```

### **Core Principles:**

1. **Product-Level Isolation**
   - Each product (HealOS, PowerDialer, Openmic, SalesRole) is separate
   - Each product can have multiple organizations
   - One organization can subscribe to multiple products

2. **Organization Identification**
   - Each product may use different org identifiers
   - Example: HealOS uses `hospital_id`, PowerDialer uses `company_id`
   - Centralized billing maps: `externalOrgId` → `organizationId`

3. **Seat-Based Billing**
   - Organization purchases seats per product
   - Seats are assigned to users
   - Billing based on seat count, not user count

4. **No Proration (Next Cycle Billing)**
   - Adding seats: Change takes effect next billing cycle
   - Removing seats: Change takes effect next billing cycle
   - Users assigned immediately, billing adjusted later

---

## **2. TECH STACK**

### **Backend:**
```
✅ Node.js v20+
✅ Express.js (REST APIs)
✅ TypeScript (Strict mode)
✅ Prisma ORM
✅ PostgreSQL 15+
✅ Redis 7+ (Cache + Rate Limiting)
✅ Bull (Queue with Redis)
```

### **Authentication:**
```
✅ Clerk (Authentication & User Management)
✅ JWT-based API authentication
✅ Role-based access control (RBAC)
```

### **Payment Processing:**
```
✅ Stripe API v2023-10-16+
✅ Stripe Checkout (Hosted)
✅ Stripe Customer Portal
✅ Stripe Webhooks (Event-driven sync)
```

### **Communication:**
```
✅ REST APIs (Primary)
✅ RabbitMQ / Redis Pub/Sub (Event bus)
✅ Webhooks (Product app notifications)
✅ GraphQL (Future - Phase 3+)
```

### **Monitoring:**
```
✅ Prometheus (Metrics)
✅ Grafana (Dashboards)
✅ Winston (Logging)
✅ Sentry (Error tracking)
```

### **Testing:**
```
✅ Jest (Unit + Integration)
✅ Supertest (API testing)
✅ Testcontainers (DB in Docker)
```

### **Deployment:**
```
✅ Docker + Docker Compose (Dev)
✅ Kubernetes (Production - Future)
✅ GitHub Actions (CI/CD)
```

---

## **3. PROJECT STRUCTURE**

```
centralized-billing/
│
├── services/
│   └── billing-service/
│       ├── src/
│       │   ├── modules/
│       │   │   ├── organization/
│       │   │   │   ├── organization.controller.ts
│       │   │   │   ├── organization.service.ts
│       │   │   │   ├── organization.repository.ts
│       │   │   │   ├── organization.validator.ts
│       │   │   │   ├── organization.routes.ts
│       │   │   │   └── dto/
│       │   │   │       ├── create-organization.dto.ts
│       │   │   │       ├── map-external-org.dto.ts
│       │   │   │       └── organization-response.dto.ts
│       │   │   │
│       │   │   ├── subscription/
│       │   │   │   ├── subscription.controller.ts
│       │   │   │   ├── subscription.service.ts
│       │   │   │   ├── subscription.repository.ts
│       │   │   │   ├── subscription.validator.ts
│       │   │   │   ├── subscription.routes.ts
│       │   │   │   └── dto/
│       │   │   │       ├── create-subscription.dto.ts
│       │   │   │       ├── update-quantity.dto.ts
│       │   │   │       └── subscription-response.dto.ts
│       │   │   │
│       │   │   ├── seat/
│       │   │   │   ├── seat.controller.ts
│       │   │   │   ├── seat.service.ts
│       │   │   │   ├── seat.repository.ts
│       │   │   │   ├── seat.validator.ts
│       │   │   │   ├── seat.routes.ts
│       │   │   │   └── dto/
│       │   │   │       ├── assign-seat.dto.ts
│       │   │   │       ├── remove-seat.dto.ts
│       │   │   │       └── seat-response.dto.ts
│       │   │   │
│       │   │   ├── plan/
│       │   │   │   ├── plan.controller.ts
│       │   │   │   ├── plan.service.ts
│       │   │   │   ├── plan.repository.ts
│       │   │   │   ├── plan.routes.ts
│       │   │   │   └── dto/
│       │   │   │
│       │   │   ├── payment/
│       │   │   │   ├── payment.controller.ts
│       │   │   │   ├── payment.service.ts
│       │   │   │   ├── payment.repository.ts
│       │   │   │   ├── payment.routes.ts
│       │   │   │   └── dto/
│       │   │   │
│       │   │   ├── trial/
│       │   │   │   ├── trial.controller.ts
│       │   │   │   ├── trial.service.ts
│       │   │   │   ├── trial.routes.ts
│       │   │   │   └── dto/
│       │   │   │
│       │   │   ├── webhook/
│       │   │   │   ├── webhook.controller.ts
│       │   │   │   ├── webhook.service.ts
│       │   │   │   ├── webhook.routes.ts
│       │   │   │   ├── handlers/
│       │   │   │   │   ├── checkout-completed.handler.ts
│       │   │   │   │   ├── subscription-updated.handler.ts
│       │   │   │   │   ├── invoice-paid.handler.ts
│       │   │   │   │   ├── invoice-failed.handler.ts
│       │   │   │   │   └── subscription-deleted.handler.ts
│       │   │   │   └── dto/
│       │   │   │
│       │   │   ├── analytics/
│       │   │   │   ├── analytics.controller.ts
│       │   │   │   ├── analytics.service.ts
│       │   │   │   ├── analytics.routes.ts
│       │   │   │   ├── jobs/
│       │   │   │   │   ├── calculate-mrr.job.ts
│       │   │   │   │   ├── calculate-seat-usage.job.ts
│       │   │   │   │   └── revenue-report.job.ts
│       │   │   │   └── dto/
│       │   │   │
│       │   │   ├── application/
│       │   │   │   ├── application.controller.ts
│       │   │   │   ├── application.service.ts
│       │   │   │   ├── application.repository.ts
│       │   │   │   ├── application.routes.ts
│       │   │   │   └── dto/
│       │   │   │
│       │   │   └── user/
│       │   │       ├── user.controller.ts
│       │   │       ├── user.service.ts
│       │   │       ├── user.repository.ts
│       │   │       ├── user.routes.ts
│       │   │       └── dto/
│       │   │
│       │   ├── shared/
│       │   │   ├── middleware/
│       │   │   │   ├── clerk-auth.middleware.ts
│       │   │   │   ├── role-guard.middleware.ts
│       │   │   │   ├── seat-access.middleware.ts
│       │   │   │   ├── rate-limit.middleware.ts
│       │   │   │   ├── validation.middleware.ts
│       │   │   │   ├── error-handler.middleware.ts
│       │   │   │   ├── request-logger.middleware.ts
│       │   │   │   └── audit-log.middleware.ts
│       │   │   │
│       │   │   ├── utils/
│       │   │   │   ├── logger.util.ts
│       │   │   │   ├── error.util.ts
│       │   │   │   ├── response.util.ts
│       │   │   │   ├── validation.util.ts
│       │   │   │   ├── encryption.util.ts
│       │   │   │   └── date.util.ts
│       │   │   │
│       │   │   ├── constants/
│       │   │   │   ├── error-codes.constant.ts
│       │   │   │   ├── events.constant.ts
│       │   │   │   ├── roles.constant.ts
│       │   │   │   └── subscription-status.constant.ts
│       │   │   │
│       │   │   ├── types/
│       │   │   │   ├── express.d.ts
│       │   │   │   ├── request.type.ts
│       │   │   │   ├── response.type.ts
│       │   │   │   └── pagination.type.ts
│       │   │   │
│       │   │   ├── decorators/
│       │   │   │   ├── roles.decorator.ts
│       │   │   │   ├── audit.decorator.ts
│       │   │   │   └── validate.decorator.ts
│       │   │   │
│       │   │   └── exceptions/
│       │   │       ├── base.exception.ts
│       │   │       ├── not-found.exception.ts
│       │   │       ├── unauthorized.exception.ts
│       │   │       ├── forbidden.exception.ts
│       │   │       ├── validation.exception.ts
│       │   │       ├── no-seats-available.exception.ts
│       │   │       └── payment.exception.ts
│       │   │
│       │   ├── infrastructure/
│       │   │   ├── database/
│       │   │   │   ├── prisma.service.ts
│       │   │   │   ├── connection.ts
│       │   │   │   └── transaction.helper.ts
│       │   │   │
│       │   │   ├── cache/
│       │   │   │   ├── redis.client.ts
│       │   │   │   ├── cache.service.ts
│       │   │   │   └── cache.decorator.ts
│       │   │   │
│       │   │   ├── queue/
│       │   │   │   ├── queue.service.ts
│       │   │   │   ├── queue.config.ts
│       │   │   │   ├── producers/
│       │   │   │   │   ├── billing-event.producer.ts
│       │   │   │   │   ├── webhook-event.producer.ts
│       │   │   │   │   └── notification.producer.ts
│       │   │   │   └── consumers/
│       │   │   │       ├── billing-event.consumer.ts
│       │   │   │       ├── webhook-event.consumer.ts
│       │   │   │       ├── trial-expiry.consumer.ts
│       │   │   │       ├── payment-retry.consumer.ts
│       │   │   │       └── seat-notification.consumer.ts
│       │   │   │
│       │   │   ├── events/
│       │   │   │   ├── event-bus.ts
│       │   │   │   ├── event-emitter.service.ts
│       │   │   │   ├── domain-events/
│       │   │   │   │   ├── subscription-created.event.ts
│       │   │   │   │   ├── subscription-canceled.event.ts
│       │   │   │   │   ├── seat-assigned.event.ts
│       │   │   │   │   ├── seat-removed.event.ts
│       │   │   │   │   ├── quantity-updated.event.ts
│       │   │   │   │   ├── payment-succeeded.event.ts
│       │   │   │   │   ├── payment-failed.event.ts
│       │   │   │   │   ├── trial-started.event.ts
│       │   │   │   │   ├── trial-ending.event.ts
│       │   │   │   │   └── trial-converted.event.ts
│       │   │   │   └── handlers/
│       │   │   │       ├── seat-assigned.handler.ts
│       │   │   │       ├── payment-failed.handler.ts
│       │   │   │       └── trial-ending.handler.ts
│       │   │   │
│       │   │   └── external/
│       │   │       ├── stripe/
│       │   │       │   ├── stripe.client.ts
│       │   │       │   ├── stripe.service.ts
│       │   │       │   ├── stripe.config.ts
│       │   │       │   └── stripe.types.ts
│       │   │       └── clerk/
│       │   │           ├── clerk.client.ts
│       │   │           ├── clerk.service.ts
│       │   │           └── clerk.types.ts
│       │   │
│       │   ├── config/
│       │   │   ├── index.ts
│       │   │   ├── app.config.ts
│       │   │   ├── database.config.ts
│       │   │   ├── redis.config.ts
│       │   │   ├── stripe.config.ts
│       │   │   ├── clerk.config.ts
│       │   │   ├── queue.config.ts
│       │   │   └── logger.config.ts
│       │   │
│       │   ├── jobs/
│       │   │   ├── index.ts
│       │   │   ├── trial-expiry-check.job.ts
│       │   │   ├── subscription-renewal.job.ts
│       │   │   ├── payment-failure-check.job.ts
│       │   │   ├── grace-period-check.job.ts
│       │   │   └── analytics-aggregation.job.ts
│       │   │
│       │   ├── graphql/                    # Future Phase 3+
│       │   │   ├── schema.graphql
│       │   │   ├── resolvers/
│       │   │   ├── types/
│       │   │   └── context.ts
│       │   │
│       │   ├── routes/
│       │   │   ├── index.ts
│       │   │   ├── v1/
│       │   │   │   ├── index.ts
│       │   │   │   ├── public.routes.ts
│       │   │   │   ├── user.routes.ts
│       │   │   │   ├── admin.routes.ts
│       │   │   │   └── app.routes.ts
│       │   │   └── health.routes.ts
│       │   │
│       │   ├── app.ts
│       │   └── server.ts
│       │
│       ├── prisma/
│       │   ├── schema.prisma
│       │   ├── migrations/
│       │   └── seed.ts
│       │
│       ├── tests/
│       │   ├── setup.ts
│       │   ├── teardown.ts
│       │   ├── helpers/
│       │   │   ├── test-db.helper.ts
│       │   │   ├── mock-stripe.helper.ts
│       │   │   └── mock-clerk.helper.ts
│       │   ├── unit/
│       │   │   ├── services/
│       │   │   ├── repositories/
│       │   │   └── utils/
│       │   ├── integration/
│       │   │   ├── api/
│       │   │   ├── database/
│       │   │   └── webhooks/
│       │   └── e2e/
│       │       ├── subscription-flow.test.ts
│       │       ├── seat-assignment.test.ts
│       │       └── trial-conversion.test.ts
│       │
│       ├── monitoring/
│       │   ├── prometheus.yml
│       │   ├── grafana/
│       │   │   └── dashboards/
│       │   │       ├── billing-overview.json
│       │   │       ├── api-performance.json
│       │   │       └── seat-metrics.json
│       │   └── alerts.yml
│       │
│       ├── scripts/
│       │   ├── setup-db.sh
│       │   ├── seed-data.ts
│       │   ├── migrate-production.sh
│       │   └── health-check.sh
│       │
│       ├── .env.example
│       ├── .env.development
│       ├── .env.test
│       ├── .gitignore
│       ├── .eslintrc.js
│       ├── .prettierrc
│       ├── jest.config.js
│       ├── tsconfig.json
│       ├── Dockerfile
│       ├── docker-compose.yml
│       ├── docker-compose.prod.yml
│       ├── package.json
│       └── README.md
│
├── shared/                       # Shared libraries across services
│   ├── types/
│   ├── utils/
│   └── events/
│
└── docs/
    ├── api/
    ├── architecture/
    └── deployment/
```

---

## **4. DATABASE SCHEMA**

### **Schema Overview:**

```
Organizations (Multi-tenant root)
    ↓
    ├─→ ExternalOrgMapping (Maps product-specific IDs)
    ├─→ Users (Organization members)
    └─→ OrganizationSubscriptions (Per-product subscriptions)
            ↓
            ├─→ SubscriptionSeats (User seat assignments)
            └─→ Payments (Billing records)

Applications (Products: HealOS, PowerDialer, etc.)
    ↓
    └─→ SubscriptionPlans (Pricing tiers per product)
            ↓
            └─→ OrganizationSubscriptions

StripeWebhookEvents (Idempotency tracking)
AuditLogs (Complete audit trail)
Analytics Tables (MRR, seat usage, revenue)
```

### **Detailed Schema Structure:**

```prisma
// ============================================
// ENUMS
// ============================================

enum OrganizationStatus {
  ACTIVE
  SUSPENDED
  DELETED
}

enum UserRole {
  OWNER           // Organization owner (full control)
  ADMIN           // Product admin (no billing access)
  BILLING_ADMIN   // Can manage seats, cannot modify subscription
  MEMBER          // Regular user
}

enum UserStatus {
  ACTIVE
  INACTIVE
  SUSPENDED
}

enum ApplicationStatus {
  ACTIVE
  INACTIVE
  MAINTENANCE
}

enum SubscriptionStatus {
  PENDING         // Checkout created, not completed
  TRIALING        // In trial period
  ACTIVE          // Paid and active
  PAST_DUE        // Payment failed, grace period
  CANCELED        // Subscription ended
  INCOMPLETE      // Initial payment failed
  INCOMPLETE_EXPIRED  // Payment never completed
  PAUSED          // Temporarily paused (future feature)
}

enum SeatStatus {
  ACTIVE          // User has access
  PENDING_INVITE  // Seat reserved, user not invited yet
  REMOVED         // User removed, seat freed
}

enum BillingInterval {
  MONTHLY
  YEARLY
  ONE_TIME
}

enum PaymentStatus {
  PENDING
  PROCESSING
  SUCCEEDED
  FAILED
  REFUNDED
  CANCELED
}

enum AuditActorType {
  USER
  SYSTEM
  WEBHOOK
  API
}

// ============================================
// CORE MODELS
// ============================================

model Organization {
  id                String              @id @default(uuid())
  name              String
  slug              String              @unique
  ownerUserId       String              // User who owns this org
  billingEmail      String
  taxId             String?
  address           Json?
  metadata          Json?
  
  // Stripe Customer (shared across all product subscriptions)
  stripeCustomerId  String?             @unique
  
  status            OrganizationStatus  @default(ACTIVE)
  
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt
  deletedAt         DateTime?
  
  // Relations
  owner             User                @relation("OrganizationOwner", fields: [ownerUserId], references: [id])
  users             User[]              @relation("OrganizationUsers")
  subscriptions     OrganizationSubscription[]
  externalMappings  ExternalOrgMapping[]
  payments          Payment[]
  auditLogs         AuditLog[]
  
  @@index([slug])
  @@index([stripeCustomerId])
  @@index([status])
  @@index([ownerUserId])
  @@map("organizations")
}

// Maps product-specific org identifiers to central organizationId
model ExternalOrgMapping {
  id              String        @id @default(uuid())
  organizationId  String
  applicationId   String
  externalOrgId   String        // Product's own org identifier
  externalOrgKey  String?       // Key name (e.g., "hospital_id", "company_id")
  metadata        Json?
  
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  
  // Relations
  organization    Organization  @relation(fields: [organizationId], references: [id])
  application     Application   @relation(fields: [applicationId], references: [id])
  
  @@unique([applicationId, externalOrgId])
  @@index([organizationId])
  @@index([applicationId])
  @@map("external_org_mappings")
}

model User {
  id              String        @id @default(uuid())
  clerkUserId     String        @unique
  email           String        @unique
  fullName        String
  organizationId  String?
  role            UserRole      @default(MEMBER)
  status          UserStatus    @default(ACTIVE)
  metadata        Json?
  
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  deletedAt       DateTime?
  
  // Relations
  organization    Organization? @relation("OrganizationUsers", fields: [organizationId], references: [id])
  ownedOrgs       Organization[] @relation("OrganizationOwner")
  subscriptionSeats SubscriptionSeat[]
  auditLogs       AuditLog[]
  
  @@index([clerkUserId])
  @@index([organizationId])
  @@index([email])
  @@index([role])
  @@map("users")
}

model Application {
  id              String              @id @default(uuid())
  name            String
  slug            String              @unique
  description     String?
  webhookUrl      String?             // Notify product app on seat changes
  status          ApplicationStatus   @default(ACTIVE)
  metadata        Json?
  
  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt
  
  // Relations
  subscriptionPlans SubscriptionPlan[]
  subscriptions     OrganizationSubscription[]
  externalMappings  ExternalOrgMapping[]
  
  @@index([slug])
  @@index([status])
  @@map("applications")
}

model SubscriptionPlan {
  id                String            @id @default(uuid())
  applicationId     String
  name              String
  slug              String
  description       String?
  
  // Stripe Integration
  stripePriceId     String            @unique  // Stripe Price ID
  stripeProductId   String                     // Stripe Product ID
  
  // Pricing
  pricePerSeat      Decimal           @db.Decimal(10, 2)  // Price per seat
  currency          String            @default("USD")
  billingInterval   BillingInterval
  
  // Seat Configuration
  minSeats          Int               @default(1)
  maxSeats          Int?              // null = unlimited
  
  // Trial
  trialPeriodDays   Int               @default(0)
  
  // Features
  features          Json?
  metadata          Json?
  isActive          Boolean           @default(true)
  
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt
  
  // Relations
  application       Application       @relation(fields: [applicationId], references: [id])
  subscriptions     OrganizationSubscription[]
  
  @@index([applicationId])
  @@index([stripePriceId])
  @@index([isActive])
  @@map("subscription_plans")
}

// ============================================
// SUBSCRIPTION & SEAT MODELS (CORE LOGIC)
// ============================================

model OrganizationSubscription {
  id                    String              @id @default(uuid())
  organizationId        String
  applicationId         String
  subscriptionPlanId    String
  
  // Stripe Integration
  stripeCustomerId      String              // From organization
  stripeSubscriptionId  String?             @unique
  stripeItemId          String?             // Subscription item ID (for quantity updates)
  
  // Seat Management (CRITICAL FIELDS)
  quantity              Int                 @default(0)  // Number of PAID seats
  status                SubscriptionStatus  @default(PENDING)
  
  // Billing Periods
  currentPeriodStart    DateTime?
  currentPeriodEnd      DateTime?
  
  // Trial
  trialStart            DateTime?
  trialEnd              DateTime?
  
  // Cancellation
  cancelAtPeriodEnd     Boolean             @default(false)
  canceledAt            DateTime?
  endedAt               DateTime?
  
  // Metadata
  metadata              Json?
  
  createdAt             DateTime            @default(now())
  updatedAt             DateTime            @updatedAt
  
  // Relations
  organization          Organization        @relation(fields: [organizationId], references: [id])
  application           Application         @relation(fields: [applicationId], references: [id])
  subscriptionPlan      SubscriptionPlan    @relation(fields: [subscriptionPlanId], references: [id])
  seats                 SubscriptionSeat[]
  payments              Payment[]
  
  // Constraints
  @@unique([organizationId, applicationId])  // One subscription per app per org
  @@index([stripeSubscriptionId])
  @@index([status])
  @@index([currentPeriodEnd])
  @@index([organizationId])
  @@index([applicationId])
  @@map("organization_subscriptions")
}

model SubscriptionSeat {
  id                        String                      @id @default(uuid())
  subscriptionId            String                      // FK to OrganizationSubscription
  userId                    String
  status                    SeatStatus                  @default(ACTIVE)
  
  // Timestamps
  assignedAt                DateTime                    @default(now())
  removedAt                 DateTime?
  
  // Metadata
  assignedBy                String?                     // userId of admin who assigned
  metadata                  Json?
  
  // Relations
  subscription              OrganizationSubscription    @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)
  user                      User                        @relation(fields: [userId], references: [id])
  
  // Constraints
  @@unique([subscriptionId, userId])  // One seat per user per subscription
  @@index([subscriptionId])
  @@index([userId])
  @@index([status])
  @@map("subscription_seats")
}

// ============================================
// PAYMENT & BILLING
// ============================================

model Payment {
  id                      String        @id @default(uuid())
  subscriptionId          String?
  organizationId          String
  
  // Stripe References
  stripePaymentIntentId   String?       @unique
  stripeInvoiceId         String?
  stripeChargeId          String?
  
  // Payment Details
  amount                  Decimal       @db.Decimal(10, 2)
  currency                String        @default("USD")
  status                  PaymentStatus @default(PENDING)
  pay


mentMethod           String?
  failureReason           String?
  receiptUrl              String?
  
  // Timestamps
  paidAt                  DateTime?
  createdAt               DateTime      @default(now())
  
  // Metadata
  metadata                Json?
  
  // Relations
  subscription            OrganizationSubscription? @relation(fields: [subscriptionId], references: [id])
  organization            Organization  @relation(fields: [organizationId], references: [id])
  
  @@index([subscriptionId])
  @@index([organizationId])
  @@index([status])
  @@index([stripePaymentIntentId])
  @@index([stripeInvoiceId])
  @@map("payments")
}

// ============================================
// WEBHOOK & AUDIT
// ============================================

model StripeWebhookEvent {
  id            String    @id @default(uuid())
  eventId       String    @unique // Stripe event.id
  eventType     String
  payload       Json
  processed     Boolean   @default(false)
  processedAt   DateTime?
  error         String?
  retryCount    Int       @default(0)
  
  createdAt     DateTime  @default(now())
  
  @@index([eventId])
  @@index([processed])
  @@index([eventType])
  @@index([createdAt])
  @@map("stripe_webhook_events")
}

model AuditLog {
  id              String          @id @default(uuid())
  entityType      String          // 'subscription', 'seat', 'payment', etc.
  entityId        String
  action          String          // 'created', 'updated', 'deleted', 'assigned', 'removed'
  actorUserId     String?
  actorType       AuditActorType  @default(USER)
  changes         Json?           // Before/after snapshot
  ipAddress       String?
  userAgent       String?
  organizationId  String?
  metadata        Json?
  
  createdAt       DateTime        @default(now())
  
  // Relations
  actorUser       User?           @relation(fields: [actorUserId], references: [id])
  organization    Organization?   @relation(fields: [organizationId], references: [id])
  
  @@index([entityType, entityId])
  @@index([createdAt])
  @@index([actorUserId])
  @@index([organizationId])
  @@map("audit_logs")
}

// ============================================
// ANALYTICS (For Dashboards)
// ============================================

model AnalyticsMRR {
  id              String    @id @default(uuid())
  organizationId  String?
  applicationId   String?
  month           DateTime  // First day of month
  mrr             Decimal   @db.Decimal(12, 2)
  activeSeats     Int
  filledSeats     Int
  emptySeats      Int
  newSubscriptions Int
  churnedSubscriptions Int
  
  createdAt       DateTime  @default(now())
  
  @@unique([organizationId, applicationId, month])
  @@index([month])
  @@index([applicationId])
  @@map("analytics_mrr")
}

model AnalyticsSeatUsage {
  id              String    @id @default(uuid())
  organizationId  String
  applicationId   String
  date            DateTime
  totalSeats      Int
  usedSeats       Int
  emptySeats      Int
  utilizationRate Decimal   @db.Decimal(5, 2)  // Percentage
  
  createdAt       DateTime  @default(now())
  
  @@unique([organizationId, applicationId, date])
  @@index([date])
  @@index([applicationId])
  @@map("analytics_seat_usage")
}

model AnalyticsRevenue {
  id              String    @id @default(uuid())
  organizationId  String?
  applicationId   String?
  date            DateTime
  revenue         Decimal   @db.Decimal(12, 2)
  payments        Int
  refunds         Decimal   @db.Decimal(12, 2)
  
  createdAt       DateTime  @default(now())
  
  @@unique([organizationId, applicationId, date])
  @@index([date])
  @@index([applicationId])
  @@map("analytics_revenue")
}
```

---

## **5. BUSINESS LOGIC**

### **5.1 Organization & External Mapping**

```typescript
// When product app creates/identifies an organization

Flow:
1. Product app (HealOS) has: hospital_id = "hosp_123"
2. Product app calls billing API: /api/v1/organizations/map
   Body: {
     applicationId: "healos_app_id",
     externalOrgId: "hosp_123",
     externalOrgKey: "hospital_id",
     organizationData: {
       name: "City Hospital",
       billingEmail: "billing@cityhospital.com"
     }
   }
3. Billing service checks:
   - Query: ExternalOrgMapping WHERE applicationId + externalOrgId
   - If exists → Return existing organizationId
   - If not exists:
     a. Create Organization
     b. Create ExternalOrgMapping
     c. Create/update Stripe Customer
     d. Return organizationId
4. Product app stores: organizationId for future requests

Business Rules:
- One externalOrgId can map to only one Organization per Application
- Same Organization can have multiple externalOrgId across different Applications
- Example: 
  - HealOS: hospital_id="hosp_123" → org_uuid_1
  - PowerDialer: company_id="comp_456" → org_uuid_1 (same org, different ID)
```

### **5.2 Subscription Purchase (Initial)**

```typescript
Flow:
1. Admin clicks "Subscribe to HealOS Team Plan"
2. Selects: 5 seats
3. Frontend calls: POST /api/v1/subscriptions/checkout
   Body: {
     organizationId: "org_uuid",
     applicationId: "healos_app_id",
     planId: "plan_team_uuid",
     quantity: 5,
     successUrl: "https://app.com/success",
     cancelUrl: "https://app.com/cancel"
   }

Backend Logic:
1. Validate inputs
2. Check: Organization doesn''t already have subscription for this app
   - Query: OrganizationSubscription WHERE orgId + appId
   - If exists with status=ACTIVE → Error: "Already subscribed"
3. Get/Create Stripe Customer:
   - Check: organization.stripeCustomerId
   - If null: Create Stripe customer, save ID
4. Get SubscriptionPlan details (stripePriceId, trial days)
5. Create Stripe Checkout Session:
   {
     mode: "subscription",
     customer: stripeCustomerId,
     line_items: [{
       price: stripePriceId,
       quantity: 5
     }],
     subscription_data: {
       trial_period_days: 14,
       metadata: {
         organizationId,
         applicationId,
         planId
       }
     },
     success_url: successUrl,
     cancel_url: cancelUrl
   }
6. Create OrganizationSubscription in DB:
   - status: PENDING
   - quantity: 5
   - stripeCustomerId: from org
   - (stripeSubscriptionId will be set by webhook)
7. Return: { checkoutUrl: session.url }

User Experience:
- Redirected to Stripe Checkout
- Enters payment details
- Stripe handles: Trial setup, payment method save
- On success: Redirected to successUrl
- Webhook confirms: Subscription created
```

### **5.3 Webhook: Checkout Completed**

```typescript
Event: checkout.session.completed

Payload:
- session.id
- session.subscription (Stripe subscription ID)
- session.metadata (organizationId, applicationId, planId)

Backend Logic:
1. Verify webhook signature
2. Check idempotency:
   - Query: StripeWebhookEvent WHERE eventId
   - If exists AND processed → Skip
   - If exists AND NOT processed → Retry
   - If not exists → Create record
3. Extract metadata from session
4. Get Stripe subscription details:
   - stripe.subscriptions.retrieve(session.subscription)
5. Update OrganizationSubscription:
   - stripeSubscriptionId = subscription.id
   - stripeItemId = subscription.items.data[0].id
   - status = subscription.status (TRIALING or ACTIVE)
   - quantity = subscription.items.data[0].quantity
   - currentPeriodStart = subscription.current_period_start
   - currentPeriodEnd = subscription.current_period_end
   - trialStart = subscription.trial_start
   - trialEnd = subscription.trial_end
6. Mark webhook as processed
7. Emit event: SUBSCRIPTION_CREATED
8. Send email to owner: "Subscription activated"
9. Notify product app (webhook): New subscription created

Business Rule:
- NO seats assigned yet
- Subscription is active (or trialing), but 0/5 seats filled
- Admin must manually assign users to seats
```

### **5.4 Assign User to Seat**

```typescript
Request: POST /api/v1/subscriptions/:subscriptionId/seats
Body: { userId: "user_uuid" }

Backend Logic:
1. Authentication check:
   - Extract requesting user from Clerk JWT
   - Get requesting user''s role
2. Authorization check:
   - If role = OWNER (organization.ownerUserId = requestingUserId) → Allow
   - If role = BILLING_ADMIN → Allow
   - Else → 403 Forbidden
3. Fetch subscription:
   - Query: OrganizationSubscription WHERE id = subscriptionId
   - Validate: status = ACTIVE or TRIALING
4. Validate user:
   - User exists
   - User belongs to same organization
   - User is not already in another status (check across all subscriptions)
5. Check existing seat:
   - Query: SubscriptionSeat WHERE subscriptionId + userId
   - If exists with status=ACTIVE → Error: "User already assigned"
   - If exists with status=REMOVED → Reactivate (update status, clear removedAt)
6. Count filled seats:
   - Query: COUNT(SubscriptionSeat WHERE subscriptionId + status=ACTIVE)
7. Check availability:
   - If filledSeats >= subscription.quantity:
     → Error: {
         code: "NO_SEATS_AVAILABLE",
         message: "All seats are filled (5/5)",
         seatsAvailable: 0,
         totalSeats: 5
       }
8. Assign seat:
   - INSERT SubscriptionSeat {
       subscriptionId,
       userId,
       status: ACTIVE,
       assignedBy: requestingUserId
     }
9. Emit event: SEAT_ASSIGNED {
     subscriptionId,
     userId,
     applicationId,
     organizationId
   }
10. Notify product app (webhook):
    POST product_app.webhookUrl
    {
      event: "seat.assigned",
      data: {
        externalOrgId,
        userId,
        applicationSlug: "healos",
        grantAccess: true
      }
    }
11. Send email to user: "Access granted to HealOS"
12. Create audit log
13. Return response: {
      success: true,
      seatId,
      seatsUsed: filledSeats + 1,
      totalSeats: quantity,
      message: "User assigned (4/5 seats filled)"
    }

Business Rules:
- Assignment is IMMEDIATE (user gets access instantly)
- NO Stripe API call (no charge)
- Product app receives webhook to enable access
- Can assign during trial (trial seats convert to paid)
```

### **5.5 Request More Seats (Increase Quantity)**

```typescript
Request: PUT /api/v1/subscriptions/:subscriptionId/quantity
Body: { newQuantity: 7 }

Backend Logic:
1. Authorization check:
   - ONLY role = OWNER can modify quantity
   - BILLING_ADMIN cannot modify quantity
2. Fetch subscription
3. Validate:
   - newQuantity > currentQuantity
   - subscription.status = ACTIVE
   - subscription.cancelAtPeriodEnd = false
4. Calculate change:
   - seatsToAdd = newQuantity - currentQuantity
   - currentPricePerSeat = subscriptionPlan.pricePerSeat
   - additionalCost = seatsToAdd * pricePerSeat
5. Stripe API call:
   stripe.subscriptions.update(stripeSubscriptionId, {
     items: [{
       id: stripeItemId,
       quantity: newQuantity
     }],
     proration_behavior: 'none',  // ← CRITICAL: No immediate charge
     billing_cycle_anchor: 'unchanged'  // Keep same billing date
   })
6. Update database:
   - subscription.quantity = newQuantity
   - (Change takes effect on next renewal)
7. Emit event: SUBSCRIPTION_QUANTITY_UPDATED
8. Create audit log
9. Return response: {
      success: true,
      currentQuantity: 5,
      newQuantity: 7,
      seatsAdded: 2,
      effectiveDate: subscription.currentPeriodEnd,
      additionalMonthlyCost: "$398.00",
      message: "2 seats will be added on Dec 15, 2025. Next invoice: $1,393.00"
    }

Business Rules:
- Change scheduled for next billing cycle
- No immediate charge
- Admin can assign users to "pending" seats before effective date
- On renewal: Stripe charges for 7 seats
- If user assigned to pending seat before effective date:
  - Seat status = PENDING_INVITE
  - User cannot access until effectiveDate
  - OR: Allow immediate access, charge prorated (future enhancement)
```

### **5.6 Reduce Seat Count**

```typescript
Request: PUT /api/v1/subscriptions/:subscriptionId/quantity
Body: { newQuantity: 3 }

Backend Logic:
1. Authorization: ONLY OWNER
2. Fetch subscription
3. Validate:
   - newQuantity < currentQuantity
   - subscription.status = ACTIVE
4. Count filled seats:
   - filledSeats = COUNT(SubscriptionSeat WHERE status=ACTIVE)
5. Critical validation:
   - If filledSeats > newQuantity:
     → Error: {
         code: "TOO_MANY_USERS_ASSIGNED",
         message: "Cannot reduce to 3 seats. Currently 4 users assigned.",
         filledSeats: 4,
         requestedSeats: 3,
         usersToRemove: 1,
         suggestion: "Remove 1 user before reducing seat count"
       }
6. Stripe API call:
   stripe.subscriptions.update(stripeSubscriptionId, {
     items: [{
       id: stripeItemId,
       quantity: newQuantity
     }],
     proration_behavior: 'none'
   })
7. Update database:
   - subscription.quantity = newQuantity
8. Calculate savings:
   - seatsRemoved = currentQuantity - newQuantity
   - monthlySavings = seatsRemoved * pricePerSeat
9. Emit event: SUBSCRIPTION_QUANTITY_REDUCED
10. Return response: {
      success: true,
      currentQuantity: 5,
      newQuantity: 3,
      seatsRemoved: 2,
      effectiveDate: subscription.currentPeriodEnd,
      monthlySavings: "$398.00",
      nextInvoice: "$597.00",
      message: "Seat count reduced. Change effective Dec 15, 2025"
    }

Business Rules:
- Must remove users BEFORE reducing seats
- Change scheduled for next billing cycle
- Continue paying for current quantity until period end
- No refund for current period
- System prevents orphaned seats (more users than seats)
```

### **5.7 Remove User from Seat**

```typescript
Request: DELETE /api/v1/subscriptions/:subscriptionId/seats/:seatId
OR: DELETE /api/v1/subscriptions/:subscriptionId/users/:userId

Backend Logic:
1. Authorization: OWNER or BILLING_ADMIN
2. Fetch seat
3. Validate:
   - Seat exists
   - Seat.status = ACTIVE
4. Update seat:
   - status = REMOVED
   - removedAt = now()
5. NO Stripe API call (quantity unchanged)
6. Emit event: SEAT_REMOVED
7. Notify product app (webhook):
   POST webhookUrl
   {
     event: "seat.removed",
     data: {
       externalOrgId,
       userId,
       applicationSlug,
       revokeAccess: true
     }
   }
8. Product app revokes access immediately
9. Create audit log
10. Return response: {
      success: true,
      message: "User removed from seat",
      seatsUsed: 3,
      totalSeats: 5,
      emptySeats: 2,
      note: "You're still paying for 5 seats. Use 'Reduce Seat Count' to lower your bill."
    }

Business Rules:
- User loses access IMMEDIATELY
- Seat becomes "empty" (available for reassignment)
- NO billing change (still paying for same quantity)
- NO refund
- Can reassign another user to this empty seat
- To reduce billing: Admin must separately call "Reduce Seat Count"
```

### **5.8 Access Control Check**

```typescript
// Middleware: checkSeatAccess(applicationSlug)

Usage in product apps:
- HealOS calls: GET /api/v1/access/verify
- Headers: { Authorization: "Bearer jwt", X-Org-Id: "org_uuid", X-App-Slug: "healos" }

Backend Logic:
1. Extract from request:
   - userId from Clerk JWT
   - organizationId from header/body
   - applicationSlug from header/route
2. Get applicationId from slug
3. Single database query (optimized):
   
   SELECT 
     os.status as subscriptionStatus,
     ss.status as seatStatus,
     os.id as subscriptionId,
     os.currentPeriodEnd
   FROM organization_subscriptions os
   INNER JOIN subscription_seats ss ON ss.subscriptionId = os.id
   WHERE os.organizationId = :orgId
     AND os.applicationId = :appId
     AND os.status IN ('ACTIVE', 'TRIALING')
     AND ss.userId = :userId
     AND ss.status = 'ACTIVE'
   LIMIT 1

4. Check result:
   - If found → User has access
   - If not found → Check which condition failed:
     a. No subscription → "Organization not subscribed"
     b. Subscription not active → "Subscription inactive: [PAST_DUE/CANCELED]"
     c. No seat → "User not assigned to seat"
     d. Seat removed → "Access revoked"

5. Cache result in Redis (5 min TTL):
   - Key: `access:${orgId}:${appId}:${userId}`
   - Value: { hasAccess: true, subscriptionId, expiresAt }

6. If access granted:
   - Attach to request context: req.subscription, req.seat
   - next()

7. If access denied:
   - Return 403: {
       error: "ACCESS_DENIED",
       reason: "NO_ACTIVE_SEAT",
       message: "Contact admin to assign you a seat",
       subscription: {
         status: "ACTIVE",
         seatsUsed: "5/5"
       }
     }

Performance Optimization:
- Cache hit → No DB query
- Cache miss → Single query with joins
- NO Stripe API call
- Response time: < 50ms

Business Rules:
- Check happens on EVERY product app request (or per session)
- Product app should cache for 5 minutes max
- If subscription goes PAST_DUE → Redis cache invalidated
- If seat removed → Redis cache invalidated
```

### **5.9 Trial Management**

```typescript
// Trial Start (handled by checkout webhook)
Flow:
1. Admin creates checkout with trial
2. Checkout completed → subscription.status = TRIALING
3. Trial period: 14 days
4. Admin assigns users to seats (e.g., 3/5)
5. Assigned users have full access during trial

// Trial End Scenarios

Scenario A: Payment Succeeds (Automatic)
Webhook: customer.subscription.updated
- subscription.status: TRIALING → ACTIVE
- trial_end passed
- First payment succeeded

Backend Logic:
1. Update subscription: status = ACTIVE
2. All assigned seats remain ACTIVE
3. Empty seats (2) remain available
4. Emit event: TRIAL_CONVERTED
5. Send email: "Trial converted, first payment successful"
6. NO changes to seat assignments

Scenario B: Payment Fails
Webhook: invoice.payment_failed
- subscription.status: TRIALING → INCOMPLETE

Backend Logic:
1. Update subscription: status = INCOMPLETE
2. Update all seats: status = REMOVED (revoke access)
3. Notify product apps: Revoke access for all users
4. Emit event: TRIAL_PAYMENT_FAILED
5. Send email: "Payment failed, please update payment method"
6. Start grace period (7 days)

Scenario C: No Payment Method (Trial Ends)
Webhook: customer.subscription.deleted
- Trial ended without payment method

Backend Logic:
1. Update subscription: status = CANCELED
2. Update all seats: status = REMOVED
3. Revoke access
4. Emit event: TRIAL_EXPIRED_NO_PAYMENT
5. Send email: "Trial ended, no payment method provided"

// Trial Reminders (Scheduled Job)
Job: checkTrialEndingSoon (runs daily)

Logic:
1. Query: subscriptions WHERE status=TRIALING AND trialEnd BETWEEN now() AND now()+3days
2. For each:
   - Calculate days remaining
   - Send reminder email:
     - 3 days before: "Trial ending soon"
     - 1 day before: "Last day of trial"
   - Emit event: TRIAL_ENDING_SOON

Business Rules:
- During trial: All features available
- Trial seats convert to paid (charge for ALL purchased seats, even if unfilled)
- If payment fails: Immediate access revocation
- Grace period applies to payment failures (7 days to update method)
```

### **5.10 Payment Failure & Grace Period**

```typescript
// Payment Failure Flow

Webhook: invoice.payment_failed

Backend Logic:
1. Find subscription by stripeSubscriptionId
2. Update subscription:
   - status = PAST_DUE
   - metadata.paymentFailedAt = now()
3. Create Payment record:
   - status = FAILED
   - failureReason = invoice.failure_reason
4. Emit event: PAYMENT_FAILED
5. Send email to owner: "Payment failed, update payment method"
6. Start grace period counter

Grace Period Configuration:
GRACE_PERIOD_DAYS = 7

Day 0: Payment fails
- Status: PAST_DUE
- Access: FULL ACCESS (keep working)
- Email 1: "Payment failed"
- Stripe: Automatic retry scheduled

Day 1: Stripe retry
- If succeeds: Back to ACTIVE (handled by webhook)
- If fails: Remain PAST_DUE

Day 3: Warning
- Email 2: "Payment still pending, access revoked in 4 days"
- In-app banner: Red alert

Day 5: Final warning
- Email 3: "Last chance, access revoked in 2 days"
- In-app: Show read-only mode warning

Day 7: Grace period ends
Scheduled Job: checkGracePeriodExpired (runs daily)

Logic:
1. Query: subscriptions WHERE status=PAST_DUE AND metadata.paymentFailedAt < now()-7days
2. For each subscription:
   a. Update: status = CANCELED, canceledAt = now()
   b. Update all seats: status = REMOVED, removedAt = now()
   c. Stripe API: Cancel subscription
   d. Notify product apps: Revoke access for all users
   e. Emit event: SUBSCRIPTION_CANCELED_PAYMENT_FAILURE
   f. Send email: "Subscription canceled due to payment failure"
   g. Create audit log

Day 30: Data retention
Scheduled Job: checkDeletedSubscriptions

Logic:
1. Query: subscriptions WHERE status=CANCELED AND canceledAt < now()-30days
2. Mark for data deletion (soft delete org data)
3. Keep billing records for accounting

// Payment Recovery
If admin adds payment method before Day 7:
Webhook: invoice.payment_succeeded

Logic:
1. Find subscription
2. Update: status = ACTIVE
3. Update seats: status = ACTIVE (restore access)
4. Notify product apps: Grant access
5. Emit event: SUBSCRIPTION_REACTIVATED
6. Send email: "Payment successful, access restored"

Business Rules:
- Grace period: 7 days (configurable)
- Full access during grace period
- Automatic Stripe retries: Days 1, 3, 5, 7
- After 7 days: Hard cutoff, access revoked
- 30-day data retention after cancellation
- Can reactivate within 30 days with payment
```

---

## **6. API ENDPOINTS**

### **6.1 Public Endpoints**

```
POST   /api/v1/webhooks/stripe              # Stripe webhook handler
GET    /api/v1/health                       # Health check
GET    /api/v1/plans                        # List all public plans (by app)
GET    /api/v1/plans/:planId                # Get plan details
GET    /api/v1/applications                 # List all applications
GET    /api/v1/applications/:slug/plans     # Plans for specific app
```

### **6.2 Organization Management**

```
POST   /api/v1/organizations                # Create organization
GET    /api/v1/organizations/:orgId         # Get organization details
PUT    /api/v1/organizations/:orgId         # Update organization
DELETE /api/v1/organizations/:orgId         # Soft delete organization

POST   /api/v1/organizations/map            # Map external org ID
GET    /api/v1/organizations/external/:externalOrgId  # Get by external ID
Query params: ?applicationId=...

POST   /api/v1/organizations/:orgId/users   # Add user to org
DELETE /api/v1/organizations/:orgId/users/:userId  # Remove user from org
GET    /api/v1/organizations/:orgId/users   # List org users
```

### **6.3 Subscription Management**

```
POST   /api/v1/subscriptions/checkout       # Create checkout session
Body: {
  organizationId,
  applicationId,
  planId,
  quantity,
  successUrl,
  cancelUrl
}

GET    /api/v1/organizations/:orgId/subscriptions  # List all org subscriptions
GET    /api/v1/subscriptions/:subscriptionId       # Get subscription details
PUT    /api/v1/subscriptions/:subscriptionId/cancel  # Cancel subscription
Body: { immediate: boolean }

GET    /api/v1/subscriptions/:subscriptionId/invoices  # Get invoices
GET    /api/v1/subscriptions/:subscriptionId/upcoming-invoice  # Preview next invoice
```

### **6.4 Quantity Management (Owner Only)**

```
PUT    /api/v1/subscriptions/:subscriptionId/quantity  # Update seat count
Body: { newQuantity: number }
Authorization: Must be OWNER

Response: {
  success: true,
  change: "increase" | "decrease",
  currentQuantity: 5,
  newQuantity: 7,
  effectiveDate: "2025-12-15T00:00:00Z",
  costImpact: {
    additionalCost: "$398.00/month"  // or savings
  }
}
```

### **6.5 Seat Management (Owner & Billing Admin)**

```
POST   /api/v1/subscriptions/:subscriptionId/seats  # Assign user to seat
Body: { userId: "user_uuid" }

DELETE /api/v1/subscriptions/:subscriptionId/seats/:seatId  # Remove user from seat
OR
DELETE /api/v1/subscriptions/:subscriptionId/users/:userId  # Remove by userId

GET    /api/v1/subscriptions/:subscriptionId/seats  # List all seats
Response: {
  totalSeats: 5,
  filledSeats: 3,
  emptySeats: 2,
  seats: [
    {
      seatId,
      user: { id, name, email },
      status: "ACTIVE",
      assignedAt,
      assignedBy: { id, name }
    }
  ]
}

GET    /api/v1/subscriptions/:subscriptionId/available-users  # Users available to assign
Query: ?excludeAssigned=true

POST   /api/v1/subscriptions/:subscriptionId/seats/bulk-assign  # Assign multiple users
Body: { userIds: ["user1", "user2", "user3"] }

POST   /api/v1/subscriptions/:subscriptionId/seats/bulk-remove  # Remove multiple
Body: { seatIds: ["seat1", "seat2"] }
```

### **6.6 Access Verification (For Product Apps)**

```
GET    /api/v1/access/verify                # Check user access
Headers: {
  Authorization: "Bearer jwt",
  X-Organization-Id: "org_uuid",
  X-Application-Slug: "healos"
}

Response (Success 200):
{
  hasAccess: true,
  subscription: {
    id,
    status: "ACTIVE",
    currentPeriodEnd,
    seatsUsed: 3,
    totalSeats: 5
  },
  seat: {
    id,
    assignedAt
  }
}

Response (Denied 403):
{
  hasAccess: false,
  reason: "NO_ACTIVE_SEAT" | "SUBSCRIPTION_INACTIVE" | "NOT_SUBSCRIBED",
  message: "Contact admin to assign you a seat",
  subscription: {
    status: "ACTIVE",
    seatsUsed: "5/5"
  }
}

POST   /api/v1/access/batch-verify         # Bulk verification
Body: {
  checks: [
    { userId, organizationId, applicationSlug },
    ...
  ]
}
Response: Array of verification results
```

### **6.7 Payment & Billing**

```
GET    /api/v1/organizations/:orgId/payments  # Payment history
Query: ?status=SUCCEEDED&from=2025-01-01&to=2025-12-31

GET    /api/v1/subscriptions/:subscriptionId/payment-methods  # List payment methods
POST   /api/v1/subscriptions/:subscriptionId/payment-methods  # Add payment method
DELETE /api/v1/subscriptions/:subscriptionId/payment-methods/:pmId  # Remove
PUT    /api/v1/subscriptions/:subscriptionId/payment-methods/:pmId/default  # Set default

GET    /api/v1/subscriptions/:subscriptionId/billing-portal  # Stripe customer portal URL
Response: { url: "https://billing.stripe.com/..." }
```

### **6.8 Analytics & Reports (Owner Only)**

```
GET    /api/v1/analytics/mrr                # Monthly Recurring Revenue
Query: ?organizationId=...&applicationId=...&from=...&to=...

GET    /api/v1/analytics/seat-utilization   # Seat usage over time
Query: ?organizationId=...&applicationId=...

GET    /api/v1/analytics/churn              # Churn rate
Query: ?period=month&applicationId=...

GET    /api/v1/organizations/:orgId/usage-summary  # Org usage summary
Response: {
  totalSeats: 15,
  usedSeats: 12,
  emptySeats: 3,
  utilizationRate: 80,
  monthlySpend: "$2985.00",
  subscriptions: [
    { app: "HealOS", seats: 5, used: 5 },
    { app: "PowerDialer", seats: 3, used: 3 },
    { app: "Openmic", seats: 7, used: 4 }
  ]
}
```

### **6.9 Admin Endpoints (Super Admin)**

```
POST   /api/v1/admin/applications           # Create application
PUT    /api/v1/admin/applications/:id       # Update application
DELETE /api/v1/admin/applications/:id       # Delete application

POST   /api/v1/admin/plans                  # Create subscription plan
PUT    /api/v1/admin/plans/:id              # Update plan
DELETE /api/v1/admin/plans/:id              # Soft delete plan
POST   /api/v1/admin/plans/:id/sync-stripe  # Sync with Stripe

GET    /api/v1/admin/organizations          # List all orgs (paginated)
GET    /api/v1/admin/subscriptions          # List all subscriptions
GET    /api/v1/admin/audit-logs             # Query audit logs
GET    /api/v1/admin/analytics/revenue      # System-wide revenue
GET    /api/v1/admin/analytics/subscriptions  # Subscription stats
```

---

## **7. STRIPE INTEGRATION**

### **7.1 Stripe Objects Mapping**

```
Stripe Customer ←→ Organization
- One Stripe customer per organization
- Shared across all product subscriptions
- organization.stripeCustomerId

Stripe Product ←→ Application + Plan Tier
- HealOS Team Plan → stripe_product_healos_team
- PowerDialer Pro → stripe_product_powerdialer_pro

Stripe Price ←→ SubscriptionPlan
- Contains: amount, currency, recurring interval
- subscriptionPlan.stripePriceId

Stripe Subscription ←→ OrganizationSubscription
- One subscription per (organization + application)
- subscription.stripeSubscriptionId

Stripe Subscription Item ←→ Seat Quantity
- subscription.items[0].quantity = number of seats
- subscription.stripeItemId (for updates)
```

### **7.2 Creating Checkout Session**

```typescript
Pseudocode:

async createCheckoutSession(data) {
  // 1. Get/Create Stripe customer
  const stripeCustomerId = await getOrCreateStripeCustomer(organizationId)
  
  // 2. Get plan details
  const plan = await getPlan(planId)
  
  // 3. Create checkout session
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: stripeCustomerId,
    line_items: [{
      price: plan.stripePriceId,
      quantity: data.quantity
    }],
    subscription_data: {
      trial_period_days: plan.trialPeriodDays,
      metadata: {
        organizationId: data.organizationId,
        applicationId: data.applicationId,
        planId: data.planId
      }
    },
    success_url: data.successUrl,
    cancel_url: data.cancelUrl,
    metadata: {
      organizationId: data.organizationId,
      applicationId: data.applicationId,
      planId: data.planId
    }
  })
  
  // 4. Create pending subscription in DB
  await createOrganizationSubscription({
    organizationId,
    applicationId,
    planId,
    quantity: data.quantity,
    status: 'PENDING',
    stripeCustomerId
  })
  
  return session.url
}
```

### **7.3 Updating Subscription Quantity**

```typescript
Pseudocode:

async updateSubscriptionQuantity(subscriptionId, newQuantity) {
  // 1. Get subscription
  const subscription = await getSubscription(subscriptionId)
  
  // 2. Update in Stripe
  await stripe.subscriptions.update(
    subscription.stripeSubscriptionId,
    {
      items: [{
        id: subscription.stripeItemId,
        quantity: newQuantity
      }],
      proration_behavior: 'none',  // ← KEY: No proration
      billing_cycle_anchor: 'unchanged'
    }
  )
  
  // 3. Update in DB
  await updateSubscription(subscriptionId, {
    quantity: newQuantity,
    updatedAt: now()
  })
  
  // 4. Emit event
  emitEvent('SUBSCRIPTION_QUANTITY_UPDATED', {
    subscriptionId,
    oldQuantity: subscription.quantity,
    newQuantity,
    effectiveDate: subscription.currentPeriodEnd
  })
}
```

### **7.4 Canceling Subscription**

```typescript
Pseudocode:

async cancelSubscription(subscriptionId, immediate = false) {
  const subscription = await getSubscription(subscriptionId)
  
  if (immediate) {
    // Cancel immediately (no refund)
    await stripe.subscriptions.cancel(subscription.stripeSubscriptionId)
    
    // Update DB
    await updateSubscription(subscriptionId, {
      status: 'CANCELED',
      canceledAt: now(),
      endedAt: now()
    })
    
    // Remove all seats
    await updateAllSeats(subscriptionId, {
      status: 'REMOVED',
      removedAt: now()
    })
    
    // Revoke access immediately
    await notifyProductApp('access.revoked', {...})
    
  } else {
    // Cancel at period end
    await stripe.subscriptions.update(
      subscription.stripeSubscriptionId,
      { cancel_at_period_end: true }
    )
    
    // Update DB
    await updateSubscription(subscriptionId, {
      cancelAtPeriodEnd: true,
      canceledAt: now()
    })
  }
  
  emitEvent('SUBSCRIPTION_CANCELED', {...})
}
```

---

## **8. WEBHOOK HANDLERS**

### **8.1 Webhook Security & Idempotency**

```typescript
Pseudocode:

async handleStripeWebhook(rawBody, signature) {
  // 1. Verify signature
  let event
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    throw new Error('Invalid signature')
  }
  
  // 2. Check idempotency
  const existingEvent = await findWebhookEvent(event.id)
  if (existingEvent && existingEvent.processed) {
    return { success: true, skipped: true }
  }
  
  // 3. Store event
  await createWebhookEvent({
    eventId: event.id,
    eventType: event.type,
    payload: event,
    processed: false
  })
  
  // 4. Process event
  try {
    await processWebhookEvent(event)
    
    // 5. Mark as processed
    await markWebhookProcessed(event.id)
    
  } catch (error) {
    // Log error, will retry
    await logWebhookError(event.id, error)
    throw error
  }
  
  return { success: true }
}
```

### **8.2 checkout.session.completed**

```typescript
async handleCheckoutCompleted(event) {
  const session = event.data.object
  const metadata = session.metadata
  
  // 1. Get Stripe subscription
  const stripeSubscription = await stripe.subscriptions.retrieve(
    session.subscription
  )
  
  // 2. Update OrganizationSubscription
  await updateOrganizationSubscription({
    where: {
      organizationId: metadata.organizationId,
      applicationId: metadata.applicationId
    },
    data: {
      stripeSubscriptionId: stripeSubscription.id,
      stripeItemId: stripeSubscription.items.data[0].id,
      status: stripeSubscription.status,  // TRIALING or ACTIVE
      quantity: stripeSubscription.items.data[0].quantity,
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      trialStart: stripeSubscription.trial_start ? new Date(stripeSubscription.trial_start * 1000) : null,
      trialEnd: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : null
    }
  })
  
  // 3. Emit event
  emitEvent('SUBSCRIPTION_CREATED', {
    organizationId: metadata.organizationId,
    applicationId: metadata.applicationId,
    subscriptionId: stripeSubscription.id,
    status: stripeSubscription.status
  })
  
  // 4. Send email
  sendEmail({
    to: organization.billingEmail,
    template: 'subscription-activated',
    data: {...}
  })
}
```

### **8.3 customer.subscription.updated**

```typescript
async handleSubscriptionUpdated(event) {
  const stripeSubscription = event.data.object
  const previousAttributes = event.data.previous_attributes
  
  // 1. Find subscription
  const subscription = await findSubscriptionByStripeId(
    stripeSubscription.id
  )
  
  if (!subscription) return
  
  // 2. Detect changes
  const updates = {}
  
  // Status change
  if (previousAttributes.status) {
    updates.status = stripeSubscription.status
    
    // Trial converted to active
    if (previousAttributes.status === 'trialing' && 
        stripeSubscription.status === 'active') {
      emitEvent('TRIAL_CONVERTED', {...})
    }
    
    // Became past due
    if (stripeSubscription.status === 'past_due') {
      emitEvent('PAYMENT_FAILED', {...})
      await startGracePeriod(subscription.id)
    }
  }
  
  // Quantity change
  if (previousAttributes.items) {
    const newQuantity = stripeSubscription.items.data[0].quantity
    if (newQuantity !== subscription.quantity) {
      updates.quantity = newQuantity
      emitEvent('SUBSCRIPTION_QUANTITY_SYNCED', {
        subscriptionId: subscription.id,
        oldQuantity: subscription.quantity,
        newQuantity
      })
    }
  }
  
  // Billing period change
  updates.currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000)
  updates.currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000)
  
  // Cancellation
  if (stripeSubscription.cancel_at_period_end) {
    updates.cancelAtPeriodEnd = true
    updates.canceledAt = new Date()
  }
  
  // 3. Update database
  await updateSubscription(subscription.id, updates)
  
  // 4. Create audit log
  await createAuditLog({
    entityType: 'subscription',
    entityId: subscription.id,
    action: 'updated',
    actorType: 'WEBHOOK',
    changes: { before: previousAttributes, after: updates }
  })
}
```

### **8.4 invoice.payment_succeeded**

```typescript
async handleInvoicePaymentSucceeded(event) {
  const invoice = event.data.object
  const subscriptionId = invoice.subscription
  
  // 1. Find subscription
  const subscription = await findSubscriptionByStripeId(subscriptionId)
  if (!subscription) return
  
  // 2. Create payment record
  await createPayment({
    subscriptionId: subscription.id,
    organizationId: subscription.organizationId,
    stripePaymentIntentId: invoice.payment_intent,
    stripeInvoiceId: invoice.id,
    amount: invoice.amount_paid / 100,  // Convert from cents
    currency: invoice.currency,
    status: 'SUCCEEDED',
    paidAt: new Date(invoice.status_transitions.paid_at * 1000),
    receiptUrl: invoice.hosted_invoice_url
  })
  
  // 3. If was past due, reactivate
  if (subscription.status === 'PAST_DUE') {
    await updateSubscription(subscription.id, {
      status: 'ACTIVE'
    })
    
    // Restore access for all seats
    await updateAllSeats(subscription.id, {
      status: 'ACTIVE'
    })
    
    emitEvent('SUBSCRIPTION_REACTIVATED', {
      subscriptionId: subscription.id
    })
    
    // Notify product apps
    const seats = await getActiveSeats(subscription.id)
    for (const seat of seats) {
      await notifyProductApp('access.granted', {
        userId: seat.userId,
        applicationSlug: subscription.application.slug
      })
    }
  }
  
  // 4. Update billing period
  await updateSubscription(subscription.id, {
    currentPeriodEnd: new Date(invoice.period_end * 1000)
  })
  
  // 5. Send receipt email
  sendEmail({
    to: subscription.organization.billingEmail,
    template: 'payment-receipt',
    data: {
      amount: invoice.amount_paid / 100,
      invoiceUrl: invoice.hosted_invoice_url
    }
  })
}
```

### **8.5 invoice.payment_failed**

```typescript
async handleInvoicePaymentFailed(event) {
  const invoice = event.data.object
  const subscriptionId = invoice.subscription
  
  // 1. Find subscription
  const subscription = await findSubscriptionByStripeId(subscriptionId)
  if (!subscription) return
  
  // 2. Update subscription status
  await updateSubscription(subscription.id, {
    status: 'PAST_DUE',
    metadata: {
      ...subscription.metadata,
      paymentFailedAt: new Date(),
      paymentFailureReason: invoice.last_finalization_error?.message
    }
  })
  
  // 3. Create failed payment record
  await createPayment({
    subscriptionId: subscription.id,
    organizationId: subscription.organizationId,
    stripeInvoiceId: invoice.id,
    amount: invoice.amount_due / 100,
    currency: invoice.currency,
    status: 'FAILED',
    failureReason: invoice.last_finalization_error?.message
  })
  
  // 4. Emit event
  emitEvent('PAYMENT_FAILED', {
    subscriptionId: subscription.id,
    organizationId: subscription.organizationId,
    amount: invoice.amount_due / 100,
    attemptCount: invoice.attempt_count
  })
  
  // 5. Send email alert
  sendEmail({
    to: subscription.organization.billingEmail,
    template: 'payment-failed',
    data: {
      amount: invoice.amount_due / 100,
      reason: invoice.last_finalization_error?.message,
      gracePeriodDays: 7,
      updatePaymentUrl: `${FRONTEND_URL}/billing/payment-methods`
    }
  })
  
  // 6. Note: Keep access during grace period
  // Access will be revoked by scheduled job after 7 days
}
```

### **8.6 customer.subscription.deleted**

```typescript
async handleSubscriptionDeleted(event) {
  const stripeSubscription = event.data.object
  
  // 1. Find subscription
  const subscription = await findSubscriptionByStripeId(
    stripeSubscription.id
  )
  if (!subscription) return
  
  // 2. Update subscription
  await updateSubscription(subscription.id, {
    status: 'CANCELED',
    canceledAt: new Date(),
    endedAt: new Date()
  })
  
  // 3. Remove all seats
  await updateAllSeats(subscription.id, {
    status: 'REMOVED',
    removedAt: new Date()
  })
  
  // 4. Revoke access for all users
  const seats = await getAllSeats(subscription.id)
  for (const seat of seats) {
    await notifyProductApp('access.revoked', {
      userId: seat.userId,
      applicationSlug: subscription.application.slug,
      externalOrgId: subscription.externalOrgId
    })
  }
  
  // 5. Emit event
  emitEvent('SUBSCRIPTION_CANCELED', {
    subscriptionId: subscription.id,
    reason: 'subscription_deleted'
  })
  
  // 6. Send email
  sendEmail({
    to: subscription.organization.billingEmail,
    template: 'subscription-canceled',
    data: {...}
  })
}
```

---

## **9. ACCESS CONTROL**

### **9.1 Middleware: Clerk Authentication**

```typescript
Pseudocode:

async clerkAuthMiddleware(req, res, next) {
  // 1. Extract JWT from Authorization header
  const token = extractToken(req.headers.authorization)
  if (!token) {
    return res.status(401).json({ error: 'No token provided' })
  }
  
  // 2. Verify with Clerk
  try {
    const clerkUser = await clerkClient.verifyToken(token)
    
    // 3. Fetch user from database
    let user = await findUserByClerkId(clerkUser.id)
    
    // 4. If user doesn't exist, create (first login)
    if (!user) {
      user = await createUser({
        clerkUserId: clerkUser.id,
        email: clerkUser.emailAddresses[0].emailAddress,
        fullName: clerkUser.fullName
      })
    }
    
    // 5. Attach to request
    req.user = user
    req.clerkUser = clerkUser
    
    next()
    
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' })
  }
}
```

### **9.2 Middleware: Role Guard**

```typescript
Pseudocode:

function requireRole(...allowedRoles) {
  return async (req, res, next) => {
    const user = req.user
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    
    // Check if user's role is in allowed roles
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Required role: ${allowedRoles.join(' or ')}`,
        userRole: user.role
      })
    }
    
    next()
  }
}

// Usage:
router.put(
  '/subscriptions/:id/quantity',
  clerkAuthMiddleware,
  requireRole('OWNER'),  // ← Only owner can modify quantity
  updateQuantityController
)

router.post(
  '/subscriptions/:id/seats',
  clerkAuthMiddleware,
  requireRole('OWNER', 'BILLING_ADMIN'),  // ← Both can assign seats
  assignSeatController
)
```

### **9.3 Middleware: Seat Access Check**

```typescript
Pseudocode:

function checkSeatAccess(applicationSlug) {
  return async (req, res, next) => {
    const userId = req.user.id
    const orgId = req.headers['x-organization-id'] || req.body.organizationId
    
    if (!orgId) {
      return res.status(400).json({ error: 'Organization ID required' })
    }
    
    // 1. Check cache first
    const cacheKey = `access:${orgId}:${applicationSlug}:${userId}`
    const cachedAccess = await redis.get(cacheKey)
    
    if (cachedAccess) {
      req.subscriptionAccess = JSON.parse(cachedAccess)
      return next()
    }
    
    // 2. Get application
    const application = await findApplicationBySlug(applicationSlug)
    if (!application) {
      return res.status(404).json({ error: 'Application not found' })
    }
    
    // 3. Check subscription and seat (single query)
    const access = await checkUserAccess({
      userId,
      organizationId: orgId,
      applicationId: application.id
    })
    
    /*
    Query performs:
    SELECT os.*, ss.*
    FROM organization_subscriptions os
    INNER JOIN subscription_seats ss ON ss.subscriptionId = os.id
    WHERE os.organizationId = ? 
      AND os.applicationId = ?
      AND os.status IN ('ACTIVE', 'TRIALING')
      AND ss.userId = ?
      AND ss.status = 'ACTIVE'
    */
    
    if (!access) {
      // Determine specific reason
      const subscription = await findOrgSubscription(orgId, application.id)
      
      if (!subscription) {
        return res.status(403).json({
          error: 'ACCESS_DENIED',
          reason: 'NOT_SUBSCRIBED',
          message: 'Organization does not have an active subscription'
        })
      }
      
      if (subscription.status !== 'ACTIVE' && subscription.status !== 'TRIALING') {
        return res.status(403).json({
          error: 'ACCESS_DENIED',
          reason: 'SUBSCRIPTION_INACTIVE',
          message: `Subscription status: ${subscription.status}`,
          subscription: {
            status: subscription.status,
            currentPeriodEnd: subscription.currentPeriodEnd
          }
        })
      }
      
      // Subscription active but no seat
      const seatsInfo = await getSeatsInfo(subscription.id)
      return res.status(403).json({
        error: 'ACCESS_DENIED',
        reason: 'NO_ACTIVE_SEAT',
        message: 'You do not have an assigned seat. Contact your administrator.',
        subscription: {
          status: subscription.status,
          seatsUsed: seatsInfo.filled,
          totalSeats: seatsInfo.total,
          seatsAvailable: seatsInfo.empty
        }
      })
    }
    
    // 4. Cache result (5 minutes)
    await redis.setex(cacheKey, 300, JSON.stringify(access))
    
    // 5. Attach to request
    req.subscriptionAccess = access
    
    next()
  }
}

// Usage in product apps:
router.get(
  '/healos/dashboard',
  clerkAuthMiddleware,
  checkSeatAccess('healos'),  // ← Check access to HealOS
  healosDashboardController
)
```

### **9.4 Middleware: Organization Ownership**

```typescript
Pseudocode:

async requireOrgOwnership(req, res, next) {
  const userId = req.user.id
  const orgId = req.params.orgId || req.body.organizationId
  
  // Check if user is owner of this organization
  const organization = await findOrganization(orgId)
  
  if (!organization) {
    return res.status(404).json({ error: 'Organization not found' })
  }
  
  if (organization.ownerUserId !== userId) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Only organization owner can perform this action'
    })
  }
  
  req.organization = organization
  next()
}

// Usage:
router.put(
  '/subscriptions/:id/quantity',
  clerkAuthMiddleware,
  requireOrgOwnership,  // ← Must be org owner
  updateQuantityController
)
```

---

## **10. EVENT-DRIVEN ARCHITECTURE**

### **10.1 Event Bus Setup**

```typescript
// Event types
enum BillingEvents {
  // Subscription lifecycle
  SUBSCRIPTION_CREATED = 'subscription.created',
  SUBSCRIPTION_UPDATED = 'subscription.updated',
  SUBSCRIPTION_CANCELED = 'subscription.canceled',
  SUBSCRIPTION_REACTIVATED = 'subscription.reactivated',
  SUBSCRIPTION_QUANTITY_UPDATED = 'subscription.quantity_updated',
  
  // Seat management
  SEAT_ASSIGNED = 'seat.assigned',
  SEAT_REMOVED = 'seat.removed',
  SEATS_BULK_ASSIGNED = 'seats.bulk_assigned',
  SEATS_BULK_REMOVED = 'seats.bulk_removed',
  
  // Trial
  TRIAL_STARTED = 'trial.started',
  TRIAL_ENDING_SOON = 'trial.ending_soon',  // 3 days before
  TRIAL_CONVERTED = 'trial.converted',
  TRIAL_EXPIRED = 'trial.expired',
  
  // Payment
  PAYMENT_SUCCEEDED = 'payment.succeeded',
  PAYMENT_FAILED = 'payment.failed',
  PAYMENT_REFUNDED = 'payment.refunded',
  
  // Organization
  ORGANIZATION_CREATED = 'organization.created',
  ORGANIZATION_SUSPENDED = 'organization.suspended',
  
  // User
  USER_ADDED_TO_ORG = 'user.added_to_org',
  USER_REMOVED_FROM_ORG = 'user.removed_from_org',
}

// Event payload interface
interface DomainEvent<T> {
  id: string                // Event ID
  type: BillingEvents
  timestamp: Date
  version: string           // API version
  data: T
  metadata: {
    correlationId: string
    causationId: string
    userId?: string
    organizationId?: string
    applicationId?: string
  }
}
```

### **10.2 Event Emission**

```typescript
Pseudocode:

class EventEmitter {
  async emit(eventType, data, metadata) {
    const event = {
      id: generateUUID(),
      type: eventType,
      timestamp: new Date(),
      version: 'v1',
      data,
      metadata: {
        correlationId: metadata.correlationId || generateUUID(),
        causationId: metadata.causationId || generateUUID(),
        ...metadata
      }
    }
    
    // 1. Publish to internal event bus (for internal handlers)
    await eventBus.publish(event)
    
    // 2. Push to queue (for async processing)
    await queue.add('billing-events', event)
    
    // 3. Notify product apps via webhook (if applicable)
    if (shouldNotifyProductApp(eventType)) {
      await queue.add('product-webhooks', {
        event,
        applicationId: metadata.applicationId
      })
    }
    
    return event.id
  }
}

// Usage in services:
async assignSeat(subscriptionId, userId) {
  // ... business logic ...
  
  await eventEmitter.emit(
    BillingEvents.SEAT_ASSIGNED,
    {
      subscriptionId,
      userId,
      seatId: seat.id
    },
    {
      organizationId: subscription.organizationId,
      applicationId: subscription.applicationId,
      userId: requestingUserId
    }
  )
}
```

### **10.3 Event Handlers**

```typescript
// Example: Handle SEAT_ASSIGNED event

class SeatAssignedHandler {
  async handle(event) {
    const { subscriptionId, userId, seatId } = event.data
    
    // 1. Send email to user
    await sendEmail({
      to: user.email,
      template: 'seat-assigned',
      data: {
        userName: user.fullName,
        applicationName: subscription.application.name,
        organizationName: subscription.organization.name
      }
    })
    
    // 2. Invalidate access cache
    await invalidateAccessCache(
      subscription.organizationId,
      subscription.applicationId,
      userId
    )
    
    // 3. Log to analytics
    await logSeatAssignment({
      subscriptionId,
      userId,
      timestamp: event.timestamp
    })
  }
}

// Register handler
eventBus.on(BillingEvents.SEAT_ASSIGNED, new SeatAssignedHandler())
```

### **10.4 Product App Webhooks**

```typescript
Pseudocode:

// Queue consumer: product-webhooks

async processProductWebhook(job) {
  const { event, applicationId } = job.data
  
  // 1. Get application webhook URL
  const application = await findApplication(applicationId)
  if (!application.webhookUrl) return
  
  // 2. Get external org mapping
  const mapping = await getExternalOrgMapping(
    event.metadata.organizationId,
    applicationId
  )
  
  // 3. Transform event for product app
  const payload = {
    event: event.type,
    timestamp: event.timestamp,
    data: {
      externalOrgId: mapping.externalOrgId,
      ...transformEventData(event)
    }
  }
  
  // 4. Send webhook
  try {
    await axios.post(application.webhookUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Billing-Signature': generateSignature(payload),
        'X-Event-Type': event.type
      },
      timeout: 5000
    })
  } catch (error) {
    // Retry logic (exponential backoff)
    if (job.attemptsMade < 5) {
      throw error  // Bull will retry
    } else {
      // Log to dead letter queue
      await logFailedWebhook({
        applicationId,
        event,
        error: error.message
      })
    }
  }
}

// Example webhook payloads sent to product apps:

// Event: SEAT_ASSIGNED
POST https://healos.com/webhooks/billing
{
  "event": "seat.assigned",
  "timestamp": "2025-11-26T10:30:00Z",
  "data": {
    "externalOrgId": "hosp_123",
    "userId": "user_uuid",
    "userEmail": "john@hospital.com",
    "action": "grant_access"
  }
}

// Event: SEAT_REMOVED
POST https://healos.com/webhooks/billing
{
  "event": "seat.removed",
  "timestamp": "2025-11-26T11:00:00Z",
  "data": {
    "externalOrgId": "hosp_123",
    "userId": "user_uuid",
    "action": "revoke_access"
  }
}

// Event: SUBSCRIPTION_CANCELED
POST https://healos.com/webhooks/billing
{
  "event": "subscription.canceled",
  "timestamp": "2025-11-26T12:00:00Z",
  "data": {
    "externalOrgId": "hosp_123",
    "action": "revoke_all_access",
    "reason": "subscription_canceled"
  }
}
```

---

## **11. MONITORING & ANALYTICS**

### **11.1 Key Metrics**

```
Business Metrics:
- MRR (Monthly Recurring Revenue)
- Seat Utilization Rate (filled / total)
- Churn Rate (monthly)
- Trial Conversion Rate
- ARPU (Average Revenue Per User)
- CLV (Customer Lifetime Value)
- Average Seats Per Organization
- Empty Seat Rate

Technical Metrics:
- API Response Time (p50, p95, p99)
- Error Rate (4xx, 5xx)
- Webhook Processing Time
- Queue Length & Processing Rate
- Database Query Performance
- Cache Hit Rate
- Stripe API Call Volume
- Failed Payment Rate

Operational Metrics:
- Active Subscriptions Count
- Subscriptions by Status
- Seats by Status
- Trial Subscriptions
- Past Due Subscriptions
- Payment Success/Failure Rate
- Webhook Success Rate
```

### **11.2 Prometheus Metrics**

```typescript
Pseudocode:

// Counter: API requests
const apiRequestsTotal = new Counter({
  name: 'billing_api_requests_total',
  help: 'Total API requests',
  labelNames: ['method', 'route', 'status']
})

// Histogram: API response time
const apiResponseTime = new Histogram({
  name: 'billing_api_response_time_seconds',
  help: 'API response time in seconds',
  labelNames: ['method', 'route']
})
