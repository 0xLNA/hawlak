import { getSupabaseServer } from "./supabase-server";
import type {
  InsightItem,
  PlaceInsights,
  Preference,
  PreferenceInsight,
} from "./types";

interface InsightRow {
  experience_id: string;
  vibe: string[] | null;
  best_for: string[] | null;
  positives: string[] | null;
  complaints: string[] | null;
  popular_items: string[] | null;
  time_context: string[] | null;
}

function aggregateField(
  rows: InsightRow[],
  field:
    | "vibe"
    | "best_for"
    | "positives"
    | "complaints"
    | "popular_items"
    | "time_context"
): InsightItem[] {
  const tagMap = new Map<
    string,
    {
      mentionCount: number;
      evidenceIds: Set<string>;
    }
  >();

  for (const row of rows) {
    const values = row[field] ?? [];

    // Same experience can count only once for the same tag.
    const uniqueValues = new Set(
      values.map((value) => value.trim()).filter(Boolean)
    );

    for (const value of uniqueValues) {
      const existing = tagMap.get(value) ?? {
        mentionCount: 0,
        evidenceIds: new Set<string>(),
      };

      if (!existing.evidenceIds.has(row.experience_id)) {
        existing.mentionCount += 1;
        existing.evidenceIds.add(row.experience_id);
      }

      tagMap.set(value, existing);
    }
  }

  return [...tagMap.entries()]
    .map(([value, stats]) => ({
      value,
      mentionCount: stats.mentionCount,
      evidenceIds: [...stats.evidenceIds],
    }))
    .sort((a, b) => b.mentionCount - a.mentionCount);
}

function buildPreferenceInsights(
  rows: InsightRow[]
): PreferenceInsight[] {
  const preferenceSources: Record<
    Preference,
    Array<{ field: keyof InsightRow; tag: string }>
  > = {
    quiet: [
      { field: "vibe", tag: "quiet" },
      { field: "vibe", tag: "calm" },
    ],

    work: [
      { field: "best_for", tag: "work" },
      { field: "best_for", tag: "study" },
    ],

    friends: [{ field: "best_for", tag: "friends" }],

    family: [
      { field: "best_for", tag: "family" },
      { field: "vibe", tag: "family_friendly" },
    ],

    budget: [
      { field: "positives", tag: "good_value" },
      { field: "positives", tag: "affordable" },
    ],

    late: [{ field: "time_context", tag: "late_night" }],
  };

  const result: PreferenceInsight[] = [];

  for (const [preference, sources] of Object.entries(
    preferenceSources
  ) as [Preference, Array<{ field: keyof InsightRow; tag: string }>][] ) {
    const evidenceIds = new Set<string>();

    for (const row of rows) {
      for (const source of sources) {
        const values = row[source.field];

        if (
          Array.isArray(values) &&
          values.includes(source.tag)
        ) {
          evidenceIds.add(row.experience_id);
        }
      }
    }

    if (evidenceIds.size > 0) {
      result.push({
        preference,
        value: preference,
        mentionCount: evidenceIds.size,
        evidenceIds: [...evidenceIds],
      });
    }
  }

  return result.sort((a, b) => b.mentionCount - a.mentionCount);
}

/** Aggregate only records whose source is a completed real user experience. */
export async function getAggregatedInsights(placeIds: string[]): Promise<Map<string, PlaceInsights>> {
  const supabase = getSupabaseServer();
  const byPlace = new Map<string, InsightRow[]>();
  if (!placeIds.length) return new Map();
  // Page real sources first; do not depend on an implicit PostgREST FK join.
  for (let offset = 0; ; offset += 100) {
    const { data: sources, error } = await supabase.from("experiences")
      .select("id, place_id").in("place_id", placeIds)
      .eq("source_type", "user_review").eq("processed", true)
      .order("id").range(offset, offset + 99);
    if (error) throw new Error("Failed to load experience sources.");
    if (!sources?.length) break;
    const sourcePlaces = new Map(sources.map(row => [row.id, row.place_id]));
    for (let rowOffset = 0; ; rowOffset += 1000) {
      const { data, error: insightError } = await supabase.from("extracted_insights")
        .select("experience_id, vibe, best_for, positives, complaints, popular_items, time_context")
        .in("experience_id", sources.map(row => row.id))
        .order("id").range(rowOffset, rowOffset + 999);
      if (insightError) throw new Error("Failed to load place insights.");
      for (const row of (data ?? []) as InsightRow[]) {
        const placeId = sourcePlaces.get(row.experience_id)!;
        const rows = byPlace.get(placeId) ?? [];
        rows.push(row);
        byPlace.set(placeId, rows);
      }
      if (!data || data.length < 1000) break;
    }
    if (sources.length < 100) break;
  }
  return new Map([...byPlace].map(([id, rows]) => [id, aggregateRows(rows)]));
}

export async function getAggregatedPlaceInsights(placeId: string): Promise<PlaceInsights | null> {
  return (await getAggregatedInsights([placeId])).get(placeId) ?? null;
}

function aggregateRows(rows: InsightRow[]): PlaceInsights {
  const evidenceCount = new Set(
    rows.map((row) => row.experience_id)
  ).size;

  return {
    vibe: aggregateField(rows, "vibe"),
    bestFor: aggregateField(rows, "best_for"),
    positives: aggregateField(rows, "positives"),
    complaints: aggregateField(rows, "complaints"),
    popularItems: aggregateField(rows, "popular_items"),
    timeContext: aggregateField(rows, "time_context"),
    preferences: buildPreferenceInsights(rows),

    evidenceCount,
    provenance: "extracted",
  };
}