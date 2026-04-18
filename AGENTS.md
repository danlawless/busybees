# Project Context for AI Assistants

<!-- BEGIN QIE DOCTRINE -->
<!-- Managed by `bin/qie doctrine apply`. Content outside the markers is preserved. -->

**Canonical rules live in [`AGENTS.md`](./AGENTS.md).** Read it first. This file adds Claude-specific notes only.

## Prime directives (the four that matter most)

1. **Read `AGENTS.md`** — every session, before any file edit.
2. **Read `CHANGELOG.md` and `TODO.md`** — before starting any task, if they exist. Never duplicate completed work.
3. **Isolate with `bin/qie worktree auto <slug>`** before modifying code when other Claude sessions may be active in this repo. The command is idempotent; it no-ops inside an existing worktree.
4. **Never log personal info, never commit secrets.** See AGENTS.md "Secrets" for the full rule.

## Session hygiene

- Use `bin/qie checkpoint "<note>"` at meaningful milestones so other sessions see what you did.
- Use `bin/qie brief <topic>` to pull RAG context from the QIE corpus before large decisions.
- End with `bin/qie worktree finish` (push + PR) when the feature is shippable, or `drop` if abandoning.

## Bash etiquette (learned from production races)

- **Always** run `git diff --cached --stat` **in the same bash block** as `git commit`, gated on an expected file count. Other concurrent sessions can rewrite the shared index between `git add` and `git commit`.
- Stage files explicitly (`git add path/to/file`), never `git add -A` or `git add .` unless you've just reviewed every listed change.

## Slash commands

Project-specific slash commands (if any) live under `.claude/commands/`. The QIE hub's master agent roster (`/bmad-agent-*`, `/quinn`) is available from any repo that carries the `_qie` symlink.

<!-- END QIE DOCTRINE -->

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
