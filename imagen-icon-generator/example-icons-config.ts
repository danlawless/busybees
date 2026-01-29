/**
 * Example icons config for generate-section-icons.ts
 * Copy this file, rename (e.g. my-section-icons.ts), and edit the icons array.
 * Run: npx tsx generate-section-icons.ts ./example-icons-config.ts
 */

export const outputDir = "public/icons";

export const icons = [
  {
    name: "growth",
    subject:
      "Artistic upward trending line with flowing organic curves, growth and prosperity visualization",
  },
  {
    name: "target",
    subject:
      "Artistic target or bullseye with elegant concentric flowing lines, precision and achievement",
  },
  {
    name: "shield",
    subject:
      "Artistic shield or protective emblem with flowing organic details, security and returns",
  },
];

// Default style matches Busy Bees theme: honey/amber (#e6b800) on cream (#fffef9), playful.
// To override, export iconStyle, e.g. charcoal-only or different palette.
// export const iconStyle = `...`;
