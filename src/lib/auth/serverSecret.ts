/**
 * The server-only key behind derived secrets (hidden auth passwords, POS
 * device approvals). A dedicated AUTH_PASSWORD_SECRET when set; otherwise the
 * service-role key, already the server's master secret -- whoever holds it owns
 * the database anyway -- so deriving from it adds no new exposure.
 */
export function serverSecret(): string {
  const secret = process.env.AUTH_PASSWORD_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error('No server secret configured');
  return secret;
}
