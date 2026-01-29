/**
 * Image Generation Style System
 *
 * Consistent visual language - "Refined Sanctuary": clinical precision meets organic luxury.
 * Used by index.ts for buildPrompt / quickPrompt. Icon generator uses its own default style
 * unless overridden in config.
 */

/** Busy Bees: indoor play 0–6, honey/amber primary, cream, honeycomb, playful. */
export const BRAND_FOUNDATION = {
  palette: {
    primary: "#e6b800", // Rich honey (site primary-500)
    accent: "#d4a300", // Deep honey (site primary-600)
    gold: "#f0c674", // Medium honey pastel (site primary-400)
    canvas: "#fffef9", // Cream white (site primary-50)
    neutral: "#2d2d2d", // Charcoal (site charcoal-800)
  },

  appleAesthetic: `
Apple product photography and keynote presentation aesthetic.
Pristine negative space, subjects floating in clean environments.
Soft gradient backgrounds with subtle depth, never flat.
Perfect lighting: soft, diffused, wrapping around subjects naturally.
Hero framing: single focal point, dramatic but not busy.
Colors precise and intentional, never muddy or oversaturated.
The "one more thing" reveal quality - every image feels significant.
Shot with the precision of a product launch, the warmth of a lifestyle brand.
  `.trim(),

  mood: [
    "serene authority",
    "clinical warmth",
    "organic luxury",
    "transformational hope",
    "premium simplicity",
  ],

  references: [
    "Apple keynote photography",
    "Apple product hero shots",
    "Jony Ive design philosophy",
    "Aman Resorts editorial",
    "Kinfolk magazine",
  ],

  globalAvoid: [
    "stock photo artificiality",
    "cluttered compositions",
    "busy backgrounds",
    "harsh shadows",
    "oversaturated colors",
    "generic corporate feel",
    "obvious AI artifacts",
    "visual noise of any kind",
  ],
};

export const IMAGE_STYLES = {
  portrait: {
    base: `Apple keynote human photography - the style used when introducing "the team behind the product."
Subject isolated against pristine gradient background (white to subtle warm gray).
Soft wraparound lighting with no harsh shadows, as if lit by a giant softbox.
Medium format precision, 85mm at f/2.8, subject sharp, background silky smooth.
Ultra-realistic skin texture - every pore visible but beautiful, never retouched plastic.
Expression: quiet confidence, inner peace, the look of someone who has solved hard problems.
Color grading: clean, neutral, skin tones warm but not orange, whites pristine.
The portrait should feel like it belongs on apple.com/leadership.`,
    keywords: ["intimate", "transformative", "ultra-realistic", "documentary authenticity", "peaceful clarity"],
    variants: {
      meditation: "Eyes gently closed, face in profile or three-quarter view, deep inner peace",
      confident: "Direct soft gaze, slight knowing smile, grounded and assured",
      candid: "Natural moment captured, genuine micro-expression, unposed authenticity",
    },
    avoid: ["fake smiles", "posed stiffness", "heavy makeup", "dramatic shadows", "plastic skin"],
  },

  architecture: {
    base: `Apple Park meets luxury wellness retreat - architectural photography with tech precision and organic warmth.
Hero framing: the building or space as the product, floating in its environment.
Pristine composition with generous negative space, sky or landscape providing breathing room.
Soft, even lighting - overcast golden hour, no harsh shadows breaking the forms.
Clean lines and organic curves coexisting, materials visible and tactile (wood grain, stone texture, glass reflection).
Color palette: warm neutrals, botanical greens, terracotta accents, cream stone.
The precision of an Apple Store exterior shot combined with Four Seasons warmth.
Every image could be a hero slide in a keynote presentation.`,
    keywords: ["sanctuary", "biophilic", "warm minimalism", "indoor-outdoor flow", "Mexican modernism"],
    variants: {
      exterior: "Building facade with landscaping, dramatic sky, sense of arrival and anticipation",
      interior: "Room or space showcasing design details, natural light, and livability",
      detail: "Close-up of material texture, craftsmanship, or design element",
      aerial: "Drone perspective showing property in landscape context, scale and setting",
    },
    avoid: ["cold empty spaces", "harsh flash lighting", "wide-angle distortion", "real estate generic"],
  },

  wellness: {
    base: `Wellness photography that elevates clinical into aspirational without losing authenticity.
Soft, diffused lighting - never harsh or clinical fluorescent.
Muted, sophisticated color palette: sage greens, warm whites, natural wood, soft terracotta.
Human element always present but often partial: hands, silhouettes, peaceful profiles.
Treatments shown with reverence and expertise - precision tools, clean surfaces, caring touch.
Negative space used intentionally to create breathing room and calm.
The feeling of a spa that happens to have world-class medical capabilities.
Shot with medium telephoto 85-135mm to compress and flatter, shallow depth of field.`,
    keywords: ["clinical warmth", "healing atmosphere", "expert care", "serene precision", "transformational"],
    variants: {
      treatment: "Practitioner hands performing therapy, focus on skill and care",
      environment: "Treatment room or wellness space, ready and waiting, calm anticipation",
      product: "Medical or wellness products arranged with editorial styling",
      moment: "Patient in peaceful state during or after treatment, genuine relief",
    },
    avoid: ["sterile hospital aesthetic", "cheesy spa clichés", "stock photo hands", "before/after implications"],
  },

  landscape: {
    base: `Landscape photography in the style of National Geographic meets luxury travel editorial.
Golden hour or blue hour lighting preferred, dramatic but not overdone.
Composition follows classical rules: rule of thirds, leading lines, foreground interest.
Mexican and tropical environments: agave fields, Pacific coast, Sierra mountains, jungle canopy.
Color grading warm but natural - never oversaturated Instagram filters.
Sense of scale with human element when appropriate (distant figure, building for reference).
Shot on medium format or high-end full frame, 24-70mm range, deep depth of field.
The land as a character - ancient, healing, transformative.`,
    keywords: ["epic scale", "healing landscape", "Mexican terrain", "golden light", "timeless"],
    variants: {
      vista: "Wide panoramic view, dramatic sky, sense of possibility",
      intimate: "Close natural detail - plants, water, texture, light through leaves",
      journey: "Path, road, or walkway leading somewhere, invitation to explore",
      aerial: "Drone shot showing landscape patterns, property in context",
    },
    avoid: ["HDR overprocessing", "cliché sunset filters", "tourist snapshot feel", "empty generic scenery"],
  },

  lifestyle: {
    base: `Lifestyle photography with Kinfolk magazine editorial sensibility.
Natural light only - window light, dappled shade, golden hour.
Muted, earthy color palette with pops of natural color from food and botanicals.
Overhead and 45-degree angles for food, eye-level for moments.
Styling is abundant but not precious - the beauty of real life elevated.
Hands in frame when showing activity - cooking, arranging, reaching.
Linen textures, ceramic vessels, weathered wood surfaces, fresh ingredients.
Shot on 35-50mm for environmental context, 85mm for intimate details.`,
    keywords: ["artisanal", "abundant simplicity", "nourishing", "slow living", "tactile warmth"],
    variants: {
      dining: "Table setting or meal, emphasis on fresh ingredients and beautiful vessels",
      moment: "Candid lifestyle activity - reading, yoga, walking, conversation",
      detail: "Close-up of object, texture, or arrangement with intentional styling",
      hands: "Human hands engaged in activity - preparing, holding, creating",
    },
    avoid: ["food photography clichés", "overly styled perfection", "empty calories aesthetic", "influencer staging"],
  },

  icon: {
    base: `Friendly, playful icon style for a children's indoor play brand (Busy Bees).
Single shape, perfectly centered, floating on cream/white negative space (#fffef9).
Warm honey/amber monochrome: rich honey (#e6b800) or deep honey (#d4a300)—no green.
Soft rounded forms, gentle curves; organic and approachable, not corporate.
Optional subtle honeycomb/hex influence where it fits the subject.
Clean and readable at small sizes, charming at large—works in honeycomb UI.
Feels cohesive with honey-themed branding and playful typography.`,
    keywords: ["playful", "honey/amber", "family-friendly", "scalable", "warm simplicity"],
    variants: {
      symbol: "Single iconic object or shape representing a concept",
      pattern: "Repeating organic motif for backgrounds or textures",
      abstract: "Non-representational form suggesting movement, growth, or transformation",
      badge: "Contained shape suitable for logos, stamps, or markers",
    },
    avoid: ["clipart quality", "cold geometric", "trendy gradients", "generic icons", "busy complexity"],
  },

  data: {
    base: `Apple Fitness+ or Stocks app data visualization aesthetic.
Smooth gradients under line charts, subtle glow on key metrics.
Minimal chrome - no gridlines, no axis clutter, just the essential data.
Brand colors: green (#1F483A) for growth, gold (#D4A63B) for highlights, clean white space.
Numbers large and confident, SF Pro Display style typography.
Animated feel even in still image - the sense of live, updating data.
Charts float on clean backgrounds with ample padding.
The sophistication of Bloomberg wrapped in Apple's consumer-friendly clarity.`,
    keywords: ["sophisticated finance", "growth trajectory", "clean data", "investor confidence", "premium analytics"],
    variants: {
      chart: "Line or bar chart showing growth, stylized and brand-colored",
      metric: "Single number or KPI presented with visual impact",
      comparison: "Side-by-side or before/after data visualization",
      flow: "Sankey or flow diagram showing process or allocation",
    },
    avoid: ["Excel default styling", "cluttered dashboards", "misleading scales", "corporate cliché"],
  },
};

export function buildPrompt(
  type: keyof typeof IMAGE_STYLES,
  subject: string,
  variant?: string
): string {
  const style = IMAGE_STYLES[type];
  const variantText =
    variant && style.variants[variant as keyof typeof style.variants]
      ? ` ${style.variants[variant as keyof typeof style.variants]}.`
      : "";
  const avoidText = [...BRAND_FOUNDATION.globalAvoid, ...style.avoid].join(", ");
  return `${subject}.${variantText}

${BRAND_FOUNDATION.appleAesthetic}

${style.base}

Mood: ${BRAND_FOUNDATION.mood.join(", ")}.
Avoid: ${avoidText}.`;
}

export const quickPrompt = {
  hero: (subject: string) => buildPrompt("architecture", subject, "exterior"),
  teamMember: (description: string) => buildPrompt("portrait", description, "confident"),
  testimonial: (description: string) => buildPrompt("portrait", description, "meditation"),
  room: (roomType: string) => buildPrompt("architecture", roomType, "interior"),
  treatment: (treatment: string) => buildPrompt("wellness", treatment, "treatment"),
  location: (scene: string) => buildPrompt("landscape", scene, "vista"),
  food: (dish: string) => buildPrompt("lifestyle", dish, "dining"),
  icon: (concept: string) => buildPrompt("icon", concept, "symbol"),
};
