# Imagen Section Icons Generator

Portable script for generating section icons with Google Gemini (Imagen). Default theme is aligned with **Busy Bees** (honey/amber on cream, playful, indoor-play). Override `iconStyle` in your config to match another site.

## Copy to another repo

1. Copy the entire `imagen-icon-generator` folder into the target repo (e.g. `scripts/imagen-icon-generator/` or `lib/imagen-icon-generator/`).
2. Install dependencies in that repo: `npm install @google/generative-ai` (and `tsx` for running TypeScript: `npm install -D tsx` if needed).
3. Set `GOOGLE_API_KEY` in `.env` (from Google AI Studio).
4. Create an icons config file (see below) and run the generator.

## Usage

From the folder (or with path to it):

```bash
npx tsx generate-section-icons.ts [config-file]
```

- **config-file** (optional): Path to a TypeScript/JavaScript file that exports the config. Default: `icons-config.ts` in the current working directory.

Example with explicit config:

```bash
npx tsx generate-section-icons.ts ./my-section-icons.ts
```

## Config file

Create a `.ts` (or `.js`) file that exports:

| Export        | Type     | Required | Description |
|---------------|----------|----------|-------------|
| `icons`       | array    | yes      | `{ name: string, subject: string }[]` – filename (no ext) and prompt subject for each icon. |
| `iconStyle`   | string   | no       | Prompt fragment for visual style. If omitted, the default Busy Bees theme is used (honey/amber on cream, playful). |
| `outputDir`   | string   | no       | Directory to write PNGs into. Default: `public/icons`. Relative to current working directory. |

**Example config** (`icons-config.ts` or `example-icons-config.ts`):

```ts
export const outputDir = "public/icons";

export const icons = [
  { name: "growth", subject: "Artistic upward trending line with flowing organic curves, growth and prosperity" },
  { name: "target", subject: "Artistic target or bullseye with elegant concentric flowing lines, precision" },
];

// Optional: override the default icon style (honey/amber, cream, playful)
// export const iconStyle = `Your custom style instructions...`;
```

Icons are saved as `{outputDir}/{name}.png`.

## Requirements

- Node 18+
- `@google/generative-ai` (Gemini API)
- `tsx` for running the script (or compile to JS and run with node)
- `GOOGLE_API_KEY` in environment. If you use a `.env` file, load it before running (e.g. `node --env-file=.env` or `dotenv -e .env -- npx tsx generate-section-icons.ts`, or add `import "dotenv/config"` at the top of the script and install `dotenv`).

## Files in this package

| File                         | Purpose |
|-----------------------------|---------|
| `index.ts`                  | Core image generation (Gemini), `generate()` and `saveImage()`. |
| `styles.ts`                 | Style system used by `index` (optional for icon-only use). |
| `generate-section-icons.ts` | CLI: loads config and generates all icons. |
| `example-icons-config.ts`   | Example config; duplicate and edit for your sections. |

You can depend only on `index.ts` + `generate-section-icons.ts` + your config if you don’t need the full style system.
