/**
 * Icons for About page: Our Values (6) and Rules sections (3).
 * Run from repo root: node --env-file=.env.local --import tsx imagen-icon-generator/generate-section-icons.ts imagen-icon-generator/about-icons-config.ts
 */

export const outputDir = "public/icons";

export const icons = [
  // Our Values
  { name: "value-safety", subject: "Artistic icon of a shield or protective symbol with gentle organic curves, safety first" },
  { name: "value-family", subject: "Artistic icon of a family or parent-and-child heart with soft organic shapes, family focus" },
  { name: "value-joy", subject: "Artistic icon of sparkles or joyful light with flowing organic curves, pure joy" },
  { name: "value-community", subject: "Artistic icon of people together or connected hands with organic warmth, community" },
  { name: "value-sustainability", subject: "Artistic icon of a leaf or gentle nature symbol with organic curves, sustainability" },
  { name: "value-learning", subject: "Artistic icon of an open book or gentle learning symbol with organic shapes, learning" },
  // Rules sections
  { name: "rules-toddler", subject: "Artistic icon of a baby or small child with soft organic shape, toddler area" },
  { name: "rules-food", subject: "Artistic icon of a coffee cup or café area with warm organic lines, food and beverage" },
  { name: "rules-party", subject: "Artistic icon of celebration or party hat with flowing organic curves, party room" },
];
