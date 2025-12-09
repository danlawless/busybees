# API Routes

Next.js App Router API routes for server-side operations.

## Critical Security Requirements

**ALWAYS validate input** - Every API route must validate request bodies with Zod schemas before processing.

**ALWAYS verify authentication** - Use Supabase auth helpers to check user sessions. Never trust client-provided user IDs.

**ALWAYS verify Stripe webhooks** - Use `stripe.webhooks.constructEvent()` with signing secret. Never process webhooks without signature verification.

## Common Mistakes to Avoid

- Exposing sensitive data in error responses (log details server-side, return generic messages to client)
- Missing CORS headers for cross-origin requests
- Not handling edge cases (missing fields, malformed data, race conditions)
- Using client-side env vars (NEXT_PUBLIC_*) for secrets

## Structure

Subdirectories represent route segments. Each `route.ts` exports HTTP method handlers (GET, POST, etc.).

@.cursor/rules/frontend/typescript-coding-standards.mdc
