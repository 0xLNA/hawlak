export const EXPERIENCE_MIN_LENGTH = 10;
export const EXPERIENCE_MAX_LENGTH = 3000;
export interface ExperienceInput { placeId: string; rawText: string }

export function parseExperience(value: unknown): ExperienceInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (typeof input.placeId !== "string" || !input.placeId.trim() || input.placeId.length > 120 || typeof input.rawText !== "string") return null;
  const length = input.rawText.trim().length;
  if (length < EXPERIENCE_MIN_LENGTH || input.rawText.length > EXPERIENCE_MAX_LENGTH) return null;
  // Preserve the original experience, including punctuation and line breaks.
  return { placeId: input.placeId, rawText: input.rawText };
}
