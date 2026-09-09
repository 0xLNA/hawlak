import type { Category, IntentProfile, Preference } from "./types";

export const categoryLabels: Record<Category | "all", string> = {
  all: "الكل", cafe: "قهوة", restaurant: "أكل", dessert: "حلا", activity: "فعالية", walk: "تمشية",
};
export const preferenceLabels: Record<Preference, string> = {
  quiet: "هادئ", work: "دراسة / عمل", friends: "جلسة أصدقاء", family: "عائلي", budget: "اقتصادي", late: "مفتوح متأخر",
};
export function isCategory(value: unknown): value is IntentProfile["category"] {
  return typeof value === "string" && Object.hasOwn(categoryLabels, value);
}
export function isPreference(value: unknown): value is Preference {
  return typeof value === "string" && Object.hasOwn(preferenceLabels, value);
}
export function parseIntent(value: unknown): IntentProfile | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  if (!isCategory(input.category) || !Array.isArray(input.preferences) || input.preferences.length > 6 || !input.preferences.every(isPreference)) return null;
  return { category: input.category, preferences: [...new Set(input.preferences)] };
}
