# BusyBees Mobile POS App

React Native companion app for Stripe Reader M2 integration.

## Overview

This mobile app connects to the M2 Bluetooth card reader and communicates with the
BusyBees backend API for payment processing. Staff can use this app on their phones or
tablets to accept payments anywhere in the play center.

## Tech Stack

- **React Native** with Expo (for easier development)
- **@stripe/stripe-terminal-react-native** - Official Stripe Terminal SDK
- **React Query** - Server state management
- **React Navigation** - Navigation

## Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- Physical iOS or Android device (simulators don't support Bluetooth)
- Stripe Reader M2 (order from Stripe Dashboard)

## Quick Start

```bash
# Install dependencies
cd mobile
npm install

# Start Expo
npx expo start

# Run on device
# - iOS: Scan QR code with Camera app
# - Android: Scan QR code with Expo Go app
```

## Environment Setup

Create `.env` in the mobile directory:

```env
EXPO_PUBLIC_API_URL=https://your-busybees-domain.com
# or for local development with ngrok:
EXPO_PUBLIC_API_URL=https://your-ngrok-url.ngrok.io
```

## M2 Reader Setup

1. **Order M2 Reader** from [Stripe Dashboard](https://dashboard.stripe.com/terminal/shop)
2. **Charge the reader** via USB-C (2 hours for full charge)
3. **Power on** by pressing the power button
4. **Pair via app** - The app will discover nearby readers

## Project Structure

```
mobile/
├── app/                    # Expo Router pages
│   ├── (auth)/            # Authentication screens
│   ├── (tabs)/            # Main app tabs
│   │   ├── pos.tsx        # POS/payment screen
│   │   ├── customers.tsx  # Customer lookup
│   │   └── settings.tsx   # Reader & app settings
│   └── _layout.tsx        # Root layout
├── components/
│   ├── terminal/          # Terminal-specific components
│   │   ├── ReaderDiscovery.tsx
│   │   ├── PaymentSheet.tsx
│   │   └── ReaderStatus.tsx
│   └── ui/                # Shared UI components
├── hooks/
│   ├── useTerminal.ts     # Terminal SDK hook
│   └── useApi.ts          # API communication
├── lib/
│   ├── api.ts             # API client
│   └── storage.ts         # Secure storage
└── types/
    └── terminal.ts        # Shared types
```

## Features

- 📱 **Reader Discovery** - Find and connect to M2 readers via Bluetooth
- 💳 **Payment Collection** - Accept tap, insert, or swipe payments
- 👥 **Customer Lookup** - Search customers by phone/name
- 🧾 **Purchase History** - View customer's passes and purchases
- ⚙️ **Offline Mode** - Queue payments when offline (M2 supports this)

## Development

### Running Locally

For local development, you need to expose your Next.js backend:

```bash
# In BusyBees root directory
npm run dev

# In another terminal, expose with ngrok
ngrok http 3000
```

Then update `EXPO_PUBLIC_API_URL` with your ngrok URL.

### Testing Payments

In test mode, the M2 reader accepts Stripe's test cards. Use the physical test card
that comes with your reader, or tap any card to simulate a payment.

## Building for Production

```bash
# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

## Security Notes

- Authentication tokens stored in secure storage (Keychain/Keystore)
- All API calls go through authenticated endpoints
- Card data never touches our servers (handled by Stripe SDK)
- Connection tokens are short-lived and scoped to locations

