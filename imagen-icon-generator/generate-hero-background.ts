/**
 * Generate a hero section background image (Busy Bees style).
 * Run from repo root: node --env-file=.env.local --import tsx imagen-icon-generator/generate-hero-background.ts
 *
 * Output: public/hero-background.png (16:9)
 */

import path from "path";
import { generate, saveImage } from "./index";

const HERO_BACKGROUND_PROMPT = `
Wide landscape decorative background for a website hero section. Busy Bees indoor play center brand. Format: wide horizontal 16:9 composition, not square.

Visual style:
- Soft gradient from cream white (#fffef9) at top to warm pastel honey/cream (#fff8e7, #fff3d0) toward bottom.
- Very subtle honeycomb or hexagonal pattern in the background - delicate, low contrast, honey-amber tint (#e6b800 at 5-10% opacity).
- Include one or two small honey buckets (classic wooden or ceramic honey jars, honey dippers) placed subtly in the scene - e.g. in a corner or to the side, soft-focus, low prominence, same cream/honey palette so they blend gently into the background.
- No text, no people. Warm, welcoming, playful but calm. Must not compete with overlayed content.
- Gentle radial glow or soft light. Organic, hand-crafted feel. No harsh edges or busy detail.
`.trim();

const DEFAULT_OUTPUT = "public/hero-background.png";

async function main() {
  const outputPath = path.resolve(process.cwd(), DEFAULT_OUTPUT);
  console.log("Generating hero background (16:9)...");

  const result = await generate({
    prompt: HERO_BACKGROUND_PROMPT,
    aspectRatio: "16:9",
    raw: true,
  });

  if (!result.success) {
    console.error("Generation failed:", result.error);
    process.exit(1);
  }

  const saved = await saveImage(result, outputPath);
  if (saved) {
    console.log("Saved to", outputPath);
  } else {
    console.error("Failed to save image");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
