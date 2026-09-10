export type Category = "cafe" | "restaurant" | "dessert" | "activity" | "walk";
export type Preference = "quiet" | "work" | "friends" | "family" | "budget" | "late";
export interface IntentProfile { category: Category | "all"; preferences: Preference[] }

/** Basic location metadata, independent of experiences or AI output. */
export interface Place {
  id: string;
  name: string;
  nameEn?: string;
  category: Category;
  latitude: number;
  longitude: number;
  address?: string;
  cuisine?: string;
  openingHours?: string;
  metadataSource: { type: "openstreetmap"; url: string; retrievedAt: string };
}
export interface Experience {
  id: string;
  placeId: string;
  rawText: string;
  createdAt: string;
  sourceType: "user_review" | "demo";
  processed: boolean;
}
export interface InsightItem {
  value: string;
  mentionCount: number;
  evidenceIds: string[];
}
export interface PreferenceInsight extends InsightItem { preference: Preference }
export interface PlaceInsights {
  vibe: InsightItem[];
  bestFor: InsightItem[];
  positives: InsightItem[];
  complaints: InsightItem[];
  popularItems: InsightItem[];
  timeContext: InsightItem[];
  preferences: PreferenceInsight[];
  /** Distinct source experiences, never a popularity or visitor count. */
  evidenceCount: number;
  provenance: "demo" | "extracted";
}
/** Future extraction boundary: the LLM extracts observations, never scores. */
export interface ExperienceExtraction {
  experienceId: string;
  placeId: string;
  extractedAt: string;
  extractorVersion: string;
  provenance: "demo" | "extracted";
  observations: { section: "vibe" | "bestFor" | "positives" | "complaints" | "popularItems"; value: string; preference?: Preference }[];
}
export interface PlaceRecord extends Place { insights: PlaceInsights | null; starCount?: number }
export interface Recommendation {
  placeId: string;
  isPrimary: boolean;
  basis: "category" | "preferences" | "available";
  matchedPreferences: Preference[];
  unconfirmedPreferences: Preference[];
  explanation: string;
  /** Request match, never a business rating; withheld below three experiences. */
  score: number | null;
  rankingScore: number;
  signals: { categoryMatch: boolean; preferenceMatchCount: number; requestedPreferenceCount: number; evidenceCount: number; starCount: number };
}
export interface RankedPlace { place: PlaceRecord; recommendation: Recommendation }
