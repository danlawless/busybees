# Authentication Logic

Supabase-based authentication utilities and middleware.

## Authentication Flow

- Email/password auth via Supabase Auth
- Session cookies managed by `@supabase/ssr`
- Protected routes check session server-side

## Security Requirements

**ALWAYS check auth server-side** - Client-side auth checks are UI hints only. Real protection happens in API routes and server components.

**NEVER trust client-provided user data** - Always fetch user details from authenticated session.

**Token refresh** - Handled automatically by Supabase client. If you see "jwt expired" errors, check session refresh logic.

## Common Patterns

```typescript
const { data: { user } } = await supabase.auth.getUser()
if (!user) return redirect('/login')
```

Verify user exists before accessing protected resources.
