# Cursor Configuration Directory

AI coding configuration for Cursor IDE - rules, commands, and personalities.

## Structure

- `rules/` - Coding standards and conventions (`.mdc` files)
- `rules/personalities/` - AI interaction styles
- `commands/` - Slash commands (symlinks to `.claude/commands/`)

## Important

All `.mdc` files are Cursor rules following specific formatting. When creating or editing rules, follow the structure in existing files and reference:

@.cursor/rules/prompt-engineering.mdc

These rules are automatically loaded based on file patterns and `alwaysApply` frontmatter.
