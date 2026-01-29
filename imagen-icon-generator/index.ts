/**
 * Image Generation Package - Gemini 2.5 Flash Image ("Nano Banana")
 *
 * Portable - copy this folder to any project
 *
 * Setup:
 * 1. npm install @google/generative-ai
 * 2. Set GOOGLE_API_KEY in .env
 *
 * Usage:
 *   import { generate, quickPrompt } from "./index";
 *   const result = await generate(quickPrompt.hero("Luxury retreat entrance"));
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { buildPrompt, quickPrompt, IMAGE_STYLES } from "./styles";

export { buildPrompt, quickPrompt, IMAGE_STYLES };

export type ImageType = keyof typeof IMAGE_STYLES;

export interface GenerateOptions {
  prompt: string;
  aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
  raw?: boolean; // Skip style system, use prompt as-is
  referenceImage?: string; // Path to reference image file
}

export interface ImageResult {
  success: boolean;
  imageBase64?: string;
  mimeType?: string;
  error?: string;
}

/**
 * Read image file and convert to base64
 */
async function readImageFile(filepath: string): Promise<{ data: string; mimeType: string } | null> {
  try {
    const fs = await import("fs/promises");
    const path = await import("path");

    const fileBuffer = await fs.readFile(filepath);
    const ext = path.extname(filepath).toLowerCase();

    let mimeType = "image/jpeg";
    if (ext === ".png") mimeType = "image/png";
    else if (ext === ".webp") mimeType = "image/webp";
    else if (ext === ".gif") mimeType = "image/gif";

    return {
      data: fileBuffer.toString("base64"),
      mimeType,
    };
  } catch (err) {
    return null;
  }
}

/**
 * Generate an image with Gemini 2.5 Flash Image
 */
export async function generate(options: GenerateOptions | string): Promise<ImageResult> {
  const opts = typeof options === "string" ? { prompt: options } : options;
  const { prompt, aspectRatio = "1:1", raw = false, referenceImage } = opts;

  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return { success: false, error: "GOOGLE_API_KEY not set" };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image" });

    // Build parts array - include reference image if provided
    const parts: Array<{ text?: string; inlineData?: { data: string; mimeType: string } }> = [];

    // Add reference image first if provided
    if (referenceImage) {
      const imageData = await readImageFile(referenceImage);
      if (imageData) {
        parts.push({
          inlineData: {
            data: imageData.data,
            mimeType: imageData.mimeType,
          },
        });
      } else {
        return { success: false, error: `Failed to read reference image: ${referenceImage}` };
      }
    }

    // Add text prompt
    parts.push({ text: prompt });

    const generationConfig: Record<string, unknown> = {
      responseModalities: ["Text", "Image"],
    };
    if (aspectRatio !== "1:1") {
      generationConfig.imageConfig = { aspectRatio };
    }

    const result = await model.generateContent({
      contents: [{ role: "user", parts }],
      // @ts-expect-error - responseModalities / imageConfig not in types yet
      generationConfig,
    });

    const candidate = result.response.candidates?.[0];

    // Check for blocking reasons or errors
    if (candidate?.finishReason && candidate.finishReason !== "STOP") {
      const safetyInfo =
        candidate.safetyRatings?.map((r) => `${r.category}: ${r.probability}`).join(", ") ||
        "No safety ratings";
      const errorMsg = referenceImage
        ? `Generation stopped: ${candidate.finishReason}. Safety ratings: ${safetyInfo}. This may be due to content filtering on the reference image.`
        : `Generation stopped: ${candidate.finishReason}. Safety ratings: ${safetyInfo}`;
      return {
        success: false,
        error: errorMsg,
      };
    }

    const responseParts = candidate?.content?.parts;
    if (responseParts) {
      for (const part of responseParts) {
        if (part.inlineData) {
          return {
            success: true,
            imageBase64: part.inlineData.data,
            mimeType: part.inlineData.mimeType,
          };
        }
      }
    }

    // If no image but we got text, log it for debugging
    const textParts = responseParts?.filter((p) => p.text).map((p) => p.text).join(" ");
    if (textParts) {
      console.warn("API returned text instead of image:", textParts);
    }

    return { success: false, error: "No image in response" };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

/**
 * Generate with built-in style system
 */
export async function generateStyled(
  type: ImageType,
  subject: string,
  variant?: string,
  aspectRatio?: GenerateOptions["aspectRatio"]
): Promise<ImageResult> {
  const prompt = buildPrompt(type, subject, variant);
  return generate({ prompt, aspectRatio });
}

/**
 * Save base64 image to file
 */
export async function saveImage(result: ImageResult, filepath: string): Promise<boolean> {
  if (!result.success || !result.imageBase64) return false;
  try {
    const fs = await import("fs/promises");
    await fs.writeFile(filepath, Buffer.from(result.imageBase64, "base64"));
    return true;
  } catch {
    return false;
  }
}

/**
 * Get data URL for React/browser use
 */
export function toDataUrl(result: ImageResult): string | null {
  if (!result.success || !result.imageBase64 || !result.mimeType) return null;
  return `data:${result.mimeType};base64,${result.imageBase64}`;
}
