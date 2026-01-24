-- Migration: Add password reset tokens table for web password reset flow
-- This stores time-limited tokens for users to reset their web password

-- Create password_reset_tokens table
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for token lookups
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON public.password_reset_tokens(token);

-- Create index for user lookups
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON public.password_reset_tokens(user_id);

-- Create index for cleanup of expired tokens
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON public.password_reset_tokens(expires_at);

-- Add RLS policies
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Only allow service role to access password reset tokens (for security)
CREATE POLICY "Service role can manage password reset tokens"
  ON public.password_reset_tokens
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Add comment explaining the table
COMMENT ON TABLE public.password_reset_tokens IS 'Stores time-limited tokens for web password reset. Tokens expire after 1 hour and can only be used once.';
COMMENT ON COLUMN public.password_reset_tokens.token IS 'Secure random token sent to user via email';
COMMENT ON COLUMN public.password_reset_tokens.expires_at IS 'Token expires 1 hour after creation';
COMMENT ON COLUMN public.password_reset_tokens.used_at IS 'Timestamp when token was used (NULL if unused)';
