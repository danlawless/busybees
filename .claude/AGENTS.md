# Claude Code Configuration Directory

AI coding configuration for Claude Code - commands, agents, skills, and context.

## Structure

- `commands/` - Slash commands (`.md` files invoked with `/command-name`)
- `agents/` - Specialized AI agents for focused tasks
- `skills/` - Auto-activated capabilities based on context
- `context.md` - Session-level AI behavior and identity

## Important

When creating commands or agents, follow frontmatter requirements and reference:

@.cursor/rules/prompt-engineering.mdc
@.cursor/rules/ai/agent-file-format.mdc

Commands must have `description` in frontmatter. Agents need `name`, `description`, `tools`, and optionally `model`.
