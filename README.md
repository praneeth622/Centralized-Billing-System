# Billing Microservice (Express + TypeScript)

This repository contains a modular Express.js microservice written in TypeScript that integrates with Stripe for payments, customers, subscriptions, and invoices.

Quick start:

1. Copy `.env.example` to `.env` and fill your Stripe keys.

2. Install dependencies:

```bash
npm install
```

3. Run in development:

```bash
npm run dev
```

4. Build and run production:

```bash
npm run build
npm start
```

Notes:
- Webhook endpoint: `POST /webhooks/stripe` expects raw `application/json` body and requires `STRIPE_WEBHOOK_SECRET`.
- Add your API auth and persistence as needed.
