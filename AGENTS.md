# Project Context for AI Assistants

## Always Apply Rules

Core project rules that apply to all tasks:

@.cursor/rules/heart-centered-ai-philosophy.mdc
@.cursor/rules/trust-and-decision-making.mdc
@.cursor/rules/personalities/common-personality.mdc
@.cursor/rules/personalities/luminous.mdc
@.cursor/rules/git-interaction.mdc
@.cursor/rules/frontend/typescript-coding-standards.mdc

## Project Overview

Indoor play center website for ages 0-6 with party booking, membership management, and Stripe payments. Production business site requiring security-first approach.

## Tech Stack

- Next.js 15.5.7 (App Router, TypeScript 5, React 19.1.0)
- Tailwind CSS 4
- Stripe (payments and subscriptions)
- Supabase (auth and database)
- Framer Motion (animations)
- React Hook Form + Zod (forms and validation)

## Project Structure

- `src/app/` - Next.js App Router pages and API routes
- `src/components/` - React components with hexagonal honeycomb design system
- `src/lib/` - Utilities, Stripe integration, Supabase client
- `src/hooks/` - Custom React hooks
- `scripts/` - Database seeding and maintenance scripts

## Code Conventions

DO:
- Use emoji prefixes in commits (✨ feature, 🐛 fix, 🔒 security, 💳 payment)
- Validate all forms with Zod schemas
- Use TypeScript strict mode - no `any` types
- Follow hexagonal honeycomb design patterns
- Use pnpm for package management
- Test payment flows in Stripe test mode before production

DON'T:
- Skip Stripe webhook signature verification
- Store sensitive keys in client components
- Use `--no-verify` on git commits (security checks required)
- Modify Supabase migrations manually
- Deploy without running `next build` locally first

## Git Workflow

Commit format: `emoji type: description` (e.g., `✨ Add party booking flow`)

CRITICAL: Never use `--no-verify` - pre-commit hooks prevent security issues.

## Important Notes

- This is a PRODUCTION business site - security vulnerabilities affect real customers
- Stripe integration uses live keys in production - treat payment code with extra care
- Previous RCE vulnerability (react2shell) was fixed - never allow unsanitized user input in shell commands
- Marketing promos system uses Supabase database with date-based expiration
- All API routes require proper authentication and input validation
