/**
 * Generate section icons from a config file.
 * Portable: run from this folder or from repo root with path to config.
 *
 * Usage: npx tsx generate-section-icons.ts [config-file]
 * Config file exports: icons { name, subject }[], optional iconStyle?, optional outputDir?
 * Default outputDir: public/icons
 */

import fs from "fs/promises";
import path from "path";
import { pathToFileURL } from "url";
import { generate, saveImage } from "./index";

/** Busy Bees site theme: honey/amber primary, cream background, playful indoor play (ages 0–6). */
const DEFAULT_ICON_STYLE = `
Friendly, playful hand-drawn illustration style—warm and approachable, like a children's indoor play brand.
Monochromatic using only rich honey/amber (#e6b800 or #d4a300) on cream white background (#fffef9).
Organic flowing lines with gentle curves; slightly rounded, soft shapes—no harsh edges.
Optional subtle honeycomb or hex hint in the composition where it fits naturally.
Clean icon simplicity: readable at small sizes, charming at large—not corporate or flat.
No background shapes, circles, or containers—just the icon floating on cream/white.
Centered composition with balanced negative space. Feels cohesive with "Busy Bees" honeycomb branding.
`.trim();

const DEFAULT_OUTPUT_DIR = "public/icons";

interface IconSpec {
  name: string;
  subject: string;
}

interface Config {
  icons: IconSpec[];
  iconStyle?: string;
  outputDir?: string;
}

async function loadConfig(configPath: string): Promise<Config> {
  const resolved = path.resolve(process.cwd(), configPath);
  const url = pathToFileURL(resolved).href;
  const mod = await import(url);
  const icons = mod.icons;
  if (!Array.isArray(icons) || icons.length === 0) {
    throw new Error(`Config must export a non-empty "icons" array. Got: ${resolved}`);
  }
  return {
    icons,
    iconStyle: mod.iconStyle ?? DEFAULT_ICON_STYLE,
    outputDir: mod.outputDir ?? DEFAULT_OUTPUT_DIR,
  };
}

async function main() {
  const configPath = process.argv[2] ?? "icons-config.ts";
  const config = await loadConfig(configPath);

  const { icons, iconStyle, outputDir } = config;
  await fs.mkdir(outputDir, { recursive: true });
  console.log(`Generating ${icons.length} section icons → ${outputDir}\n`);

  for (const icon of icons) {
    console.log(`Generating ${icon.name}...`);

    const prompt = `${icon.subject}. ${iconStyle}`;
    const result = await generate({ prompt, aspectRatio: "1:1", raw: true });

    if (result.success) {
      const filepath = path.join(outputDir, `${icon.name}.png`);
      const saved = await saveImage(result, filepath);
      if (saved) {
        console.log(`  ✓ Saved to ${filepath}`);
      } else {
        console.error(`  ✗ Failed to save ${icon.name}`);
      }
    } else {
      console.error(`  ✗ Generation failed: ${result.error}`);
    }
  }

  console.log("\nDone!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
