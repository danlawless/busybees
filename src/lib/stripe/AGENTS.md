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

## Stripe Terminal Integration

In-person payments via card readers. See `docs/STRIPE_TERMINAL_INTEGRATION.md` for full
documentation.

### Key Files

- `src/lib/stripe/terminal.ts` - Server-side Terminal utilities
- `src/app/api/stripe/terminal/*` - Terminal API endpoints
- `src/hooks/useTerminal.ts` - Client-side Terminal hook
- `src/components/pos/TerminalProvider.tsx` - React context provider
- `src/components/pos/ReaderConnection.tsx` - Reader discovery UI
- `src/components/pos/TerminalPayment.tsx` - Payment collection UI

### Supported Readers

- **M2** (Bluetooth) - Requires React Native mobile app
- **S700** (Internet) - Works directly with web app
- **Simulated** - For development/testing

### Payment Methods

The POS route (`/api/purchases/pos`) supports:

- `terminal` - Card present via Terminal SDK
- `saved_card` - Customer's saved payment method
- `cash` - Cash transactions (no Stripe)
- `test` - Auto-confirm with test card (test mode only)

## Testing

Use Stripe test cards and CLI for webhook testing locally. Never test with real payment methods.
