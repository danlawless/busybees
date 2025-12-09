# Stripe Payment Integration

Production payment processing - extreme care required.

## Critical Rules

**NEVER expose secret keys to client** - Only use `STRIPE_SECRET_KEY` server-side. Client gets publishable key only.

**ALWAYS use idempotency keys** - For payment intents and customer creation to prevent duplicate charges.

**ALWAYS verify webhook signatures** - Stripe sends test events that look real. Signature verification is the ONLY way to confirm legitimacy.

**NEVER store full card numbers** - Use Stripe Elements/Payment Element. Never handle raw card data.

**ALWAYS use test mode locally** - Production keys stay in production environment only.

## Previous Issues

This codebase had payment persistence bugs. When modifying payment flows, verify:
- Payment intent creation with correct amount/currency
- Successful payment updates database state
- Error cases properly rolled back
- Webhooks handle all payment states (succeeded, failed, canceled)

## Testing

Use Stripe test cards and CLI for webhook testing locally. Never test with real payment methods.
