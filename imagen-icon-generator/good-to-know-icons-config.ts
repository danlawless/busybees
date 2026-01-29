/**
 * Good to Know section icons (Hero). Uses default Busy Bees style: honey/amber on cream, playful.
 * Run from repo root: node --env-file=.env.local --import tsx imagen-icon-generator/generate-section-icons.ts imagen-icon-generator/good-to-know-icons-config.ts
 */

export const outputDir = "public/icons";

// No iconStyle = use default Busy Bees theme (honey/amber on cream, playful, same as Features icons)

export const icons = [
  {
    name: "cash-free",
    subject:
      "Artistic icon of a credit card or payment card with gentle organic curves, cash-free, cards accepted",
  },
  {
    name: "socks",
    subject:
      "Artistic icon of a pair of socks or single sock with soft organic shape, socks required",
  },
  {
    name: "drop-in",
    subject:
      "Artistic icon of an open door or calendar with checkmark, drop in, no reservation needed",
  },
  {
    name: "outside-food",
    subject:
      "Artistic icon of a takeout bag or café cup and snack, outside food welcome, café area",
  },
];
