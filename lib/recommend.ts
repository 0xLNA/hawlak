import { preferenceLabels } from "./intent";
import { usableInsights } from "./insights";
import type { IntentProfile, PlaceRecord, Recommendation } from "./types";

/** Unknown preferences never become positive claims. Category matches lead;
 * all other places remain selectable on the map. No synthetic quality score.
 */
export function recommend(places: readonly PlaceRecord[], intent: IntentProfile): Recommendation[] {
  const requested = [...new Set(intent.preferences)];
  return places.map((place): Recommendation => {
    const insights = usableInsights(place.insights);
    const categoryMatch = intent.category === "all" || place.category === intent.category;
    const matchedPreferences = requested.filter(pref => insights?.preferences.some(item => item.preference === pref));
    const unconfirmedPreferences = requested.filter(pref => !matchedPreferences.includes(pref));
    const evidenceCount = insights?.evidenceCount ?? 0;
    const starCount = Number.isFinite(place.starCount) ? Math.max(0, Math.floor(place.starCount!)) : 0;
    const preferenceMatch = requested.length ? matchedPreferences.length / requested.length : 0;
    const confidence = Math.min(1, evidenceCount / 10);
    const popularity = Math.min(1, Math.log10(starCount + 1) / Math.log10(11));
    const rankingScore = 40 * Number(categoryMatch) + 40 * preferenceMatch + 15 * confidence + 5 * popularity;
    const basis = categoryMatch ? matchedPreferences.length ? "preferences" : "category" : "available";
    const explanation = !categoryMatch ? "مكان آخر متاح للاستكشاف على الخريطة." : matchedPreferences.length
      ? `تدعم التجارب المتاحة: ${matchedPreferences.map(pref => preferenceLabels[pref]).join("، ")}.`
      : requested.length ? "من نوع طلعتك؛ لا توجد تجارب كافية لتأكيد تفضيلاتك بعد."
      : intent.category === "all" ? "مكان متاح للاستكشاف في الرياض." : "يناسب نوع الطلعة الذي اخترته.";
    return {
      placeId: place.id, isPrimary: categoryMatch, basis, matchedPreferences, unconfirmedPreferences, explanation,
      score: evidenceCount >= 3 ? Math.round(rankingScore * 10) / 10 : null,
      rankingScore,
      signals: { categoryMatch, preferenceMatchCount: matchedPreferences.length, requestedPreferenceCount: requested.length, evidenceCount, starCount },
    };
  }).sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || b.rankingScore - a.rankingScore || a.placeId.localeCompare(b.placeId, "en"));
}
