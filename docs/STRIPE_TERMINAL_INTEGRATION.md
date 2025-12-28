# Stripe Terminal Integration Guide

## Overview

BusyBees supports Stripe Terminal for in-person card payments. This document covers the
integration architecture and how to use different reader types.

## Reader Options

### Stripe Reader M2 ($59)

The M2 is a compact **Bluetooth-only** mobile reader that's great for mobile payments.

**Connectivity:** Bluetooth LE
**Works with:** iOS, Android, React Native mobile apps
**Does NOT work with:** Web browsers directly

**For M2 Integration:**
Since M2 requires Bluetooth, you'll need a mobile companion app. Options:

1. **React Native App** - Build a companion app using Stripe's React Native SDK
2. **Expo App** - Use `@stripe/stripe-terminal-react-native`
3. **Native iOS/Android** - Use platform-specific Stripe Terminal SDKs

The server-side infrastructure in this codebase (connection tokens, locations, readers
API) works with the M2 via mobile apps.

### Stripe Reader S700 (~$349)

The S700 is a smart countertop reader with a touchscreen.

**Connectivity:** WiFi/Ethernet (internet-connected)
**Works with:** Web apps via Terminal JS SDK, iOS, Android

**For S700 Integration:**
This reader works directly with the web app. Simply:

1. Order S700 from Stripe Dashboard
2. Register it to your location via the admin panel
3. Connect using the Terminal JS SDK (already integrated)

### Simulated Reader (Development)

For development and testing, use Stripe's simulated reader.

**Connectivity:** Virtual (no hardware needed)
**Works with:** All platforms in test mode

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         Your Systems                              │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────┐       ┌─────────────────┐                   │
│  │   Next.js Web   │       │  React Native   │                   │
│  │      App        │       │   Mobile App    │                   │
│  │                 │       │   (for M2)      │                   │
│  │  Terminal JS    │       │                 │                   │
│  │  (S700/Sim)     │       │  Terminal SDK   │                   │
│  └────────┬────────┘       └────────┬────────┘                   │
│           │                         │                             │
│           └────────────┬────────────┘                             │
│                        ▼                                          │
│         ┌──────────────────────────────┐                         │
│         │      API Routes (Server)      │                         │
│         │  /api/stripe/terminal/*       │                         │
│         │                               │                         │
│         │  • connection-token           │                         │
│         │  • locations                  │                         │
│         │  • readers                    │                         │
│         │  • payment                    │                         │
│         └──────────────┬───────────────┘                         │
│                        ▼                                          │
└─────────────────── Stripe API ───────────────────────────────────┘
```

## API Endpoints

### Connection Token

```
POST /api/stripe/terminal/connection-token
```

Creates a connection token for Terminal SDK authentication. Called automatically by the
SDK when connecting to readers.

**Request:**
```json
{
  "location_id": "tml_xxx" // Optional, scope token to location
}
```

**Response:**
```json
{
  "secret": "pst_test_xxx..."
}
```

### Locations

Locations represent physical business locations where readers are deployed.

```
GET  /api/stripe/terminal/locations        # List all locations
POST /api/stripe/terminal/locations        # Create location
GET  /api/stripe/terminal/locations/[id]   # Get location
PATCH /api/stripe/terminal/locations/[id]  # Update location
DELETE /api/stripe/terminal/locations/[id] # Delete location
```

**Create Location:**
```json
{
  "display_name": "BusyBees Main Location",
  "address": {
    "line1": "123 Play Street",
    "city": "Funtown",
    "state": "CA",
    "postal_code": "90210",
    "country": "US"
  }
}
```

### Readers

```
GET  /api/stripe/terminal/readers          # List readers
POST /api/stripe/terminal/readers          # Register reader (internet-connected)
GET  /api/stripe/terminal/readers/[id]     # Get reader
PATCH /api/stripe/terminal/readers/[id]    # Update reader label
DELETE /api/stripe/terminal/readers/[id]   # Delete reader
```

### Terminal Payment

```
POST /api/stripe/terminal/payment
```

Creates a PaymentIntent optimized for Terminal (card_present).

**Request:**
```json
{
  "amount": 2500,          // In cents
  "customer_id": "uuid",   // BusyBees customer ID
  "description": "Day Pass",
  "metadata": {
    "product_id": "xxx"
  }
}
```

**Response:**
```json
{
  "payment_intent_id": "pi_xxx",
  "client_secret": "pi_xxx_secret_xxx",
  "amount": 2500,
  "currency": "usd"
}
```

## POS Purchase Flow

The POS purchase route (`/api/purchases/pos`) supports multiple payment methods:

### Terminal Payment

```json
{
  "customer_id": "uuid",
  "product_id": "prod_xxx",
  "product_name": "Day Pass",
  "product_price": 25.00,
  "purchase_type": "day_pass",
  "payment_method": "terminal",
  "terminal_payment_intent_id": "pi_xxx"  // From Terminal SDK
}
```

### Saved Card Payment

```json
{
  "customer_id": "uuid",
  "product_id": "prod_xxx",
  "product_name": "Day Pass",
  "product_price": 25.00,
  "purchase_type": "day_pass",
  "payment_method": "saved_card",
  "payment_method_id": "pm_xxx"  // Customer's saved payment method
}
```

### Cash Payment

```json
{
  "customer_id": "uuid",
  "product_id": "prod_xxx",
  "product_name": "Day Pass",
  "product_price": 25.00,
  "purchase_type": "day_pass",
  "payment_method": "cash"
}
```

### Test Payment (Development Only)

```json
{
  "customer_id": "uuid",
  "product_id": "prod_xxx",
  "product_name": "Day Pass",
  "product_price": 25.00,
  "purchase_type": "day_pass",
  "payment_method": "test"  // Only works in test mode
}
```

## Client Components

### TerminalProvider

Wrap your POS pages with `TerminalProvider`:

```tsx
import { TerminalProvider } from '@/components/pos/TerminalProvider';

export default function POSLayout({ children }) {
  return (
    <TerminalProvider
      locationId="tml_xxx"  // Optional
      simulated={process.env.NODE_ENV === 'development'}
    >
      {children}
    </TerminalProvider>
  );
}
```

### ReaderConnection

Display reader discovery and connection UI:

```tsx
import { ReaderConnection } from '@/components/pos/ReaderConnection';

function POSPage() {
  return (
    <ReaderConnection
      onConnectionChange={(connected, reader) => {
        console.log('Reader connected:', connected, reader);
      }}
    />
  );
}
```

### TerminalPayment

Process a payment:

```tsx
import { TerminalPayment } from '@/components/pos/TerminalPayment';

function CheckoutPage() {
  return (
    <TerminalPayment
      customerId="uuid"
      amount={25.00}
      description="Day Pass"
      metadata={{ product_id: 'xxx' }}
      onSuccess={(paymentIntentId) => {
        // Save purchase with terminal_payment_intent_id
      }}
      onError={(error) => {
        console.error('Payment failed:', error);
      }}
    />
  );
}
```

### useTerminal Hook

For custom Terminal UI:

```tsx
import { useTerminal } from '@/hooks/useTerminal';

function CustomTerminalUI() {
  const {
    isConnected,
    connectedReader,
    discoveredReaders,
    initialize,
    discoverReaders,
    connectReader,
    collectPayment,
  } = useTerminal({ simulated: true });

  // Build custom UI...
}
```

## Setup Guide

### 1. Create a Location

First, create a location in Stripe for your play center:

```bash
# Via API
curl -X POST /api/stripe/terminal/locations \
  -H "Content-Type: application/json" \
  -d '{
    "display_name": "BusyBees Play Center",
    "address": {
      "line1": "123 Play Street",
      "city": "Funtown",
      "state": "CA",
      "postal_code": "90210",
      "country": "US"
    }
  }'
```

Or use the Stripe Dashboard: Terminal → Locations → Add location

### 2. Choose Your Reader

**For Web POS (Countertop):**
- Order Stripe Reader S700
- Register via Dashboard or API
- Connect using the web components

**For Mobile POS (Bluetooth M2):**
- Order Stripe Reader M2
- Build React Native companion app
- Use the same server-side APIs

### 3. Test with Simulated Reader

During development:

```tsx
<TerminalProvider simulated={true}>
  <ReaderConnection />
  <TerminalPayment amount={25.00} customerId="xxx" />
</TerminalProvider>
```

Simulated readers accept test cards automatically.

### 4. Production Deployment

1. Switch to live Stripe keys in Settings
2. Connect physical reader
3. Test end-to-end payment flow
4. Train staff on reader usage

## Troubleshooting

### "No readers found"

- Ensure reader is powered on
- For S700: Check WiFi/Ethernet connection
- For M2: Ensure Bluetooth is enabled on device
- For simulated: Make sure `simulated: true` is set

### "Connection token failed"

- Verify Stripe API keys are configured
- Check that the user has staff/admin role
- Ensure location ID is valid (if specified)

### "Payment failed"

- Check PaymentIntent status in Stripe Dashboard
- Verify card is valid (use Stripe test cards in test mode)
- Check for insufficient funds or blocked cards

## React Native M2 Integration

If you choose to build a React Native companion app for M2:

### 1. Install Dependencies

```bash
npm install @stripe/stripe-terminal-react-native
```

### 2. Configure Native Modules

Follow Stripe's setup guide for iOS/Android:
- iOS: Add background modes, NSBluetoothAlwaysUsageDescription
- Android: Add Bluetooth permissions

### 3. Use Your Existing APIs

```typescript
// Reuse the same connection token endpoint
const fetchConnectionToken = async () => {
  const response = await fetch(`${API_URL}/api/stripe/terminal/connection-token`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const { secret } = await response.json();
  return secret;
};

// Initialize Terminal
await StripeTerminal.initialize({
  fetchConnectionToken,
});

// Discover M2 readers
const { readers } = await StripeTerminal.discoverReaders({
  discoveryMethod: 'bluetoothScan',
});
```

## Security Considerations

- Connection tokens are short-lived and scoped to locations
- Terminal SDK handles card data - never touches your servers
- All API endpoints require staff/admin authentication
- Payment processing happens on Stripe's PCI-compliant infrastructure

## Resources

- [Stripe Terminal Docs](https://docs.stripe.com/terminal)
- [M2 Reader Setup](https://docs.stripe.com/terminal/payments/setup-reader/stripe-m2)
- [S700 Reader Setup](https://docs.stripe.com/terminal/payments/setup-reader/stripe-s700)
- [Terminal JS SDK](https://docs.stripe.com/terminal/payments/connect-reader?reader-type=internet)
- [React Native SDK](https://docs.stripe.com/terminal/payments/connect-reader?reader-type=bluetooth)

