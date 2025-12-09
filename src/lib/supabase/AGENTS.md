# Supabase Client and Database Access

Authentication and database operations.

## Client Types

- **Server Component**: Use `createClient()` from `server.ts` - full access with service role
- **Client Component**: Use `createClient()` from `client.ts` - user-scoped access
- **API Routes**: Use `createClient()` from `server.ts` - authenticates from cookies

**CRITICAL**: Never use server client in client components - exposes service role key.

## Row Level Security (RLS)

All tables have RLS policies. When queries fail with permission errors:
1. Check user is authenticated for the operation
2. Verify RLS policy allows the action
3. Don't bypass RLS unless absolutely necessary (and document why)

## Common Patterns

- Always check `user` exists before database operations requiring auth
- Use `select()` to specify exact columns needed (don't fetch everything)
- Handle database errors gracefully (connection issues, constraint violations)

## Migrations

Never edit migration files manually - they're tracked in version control and applied in order.
