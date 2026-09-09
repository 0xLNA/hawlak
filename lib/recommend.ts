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
    const basis = categoryMatch ? matchedPreferences.length ? "preferences" : "category" : "available";
    const explanation = !categoryMatch ? "مكان آخر متاح للاستكشاف على الخريطة." : matchedPreferences.length
      ? `تدعم التجارب المتاحة: ${matchedPreferences.map(pref => preferenceLabels[pref]).join("، ")}.`
      : requested.length ? "من نوع طلعتك؛ لا توجد تجارب كافية لتأكيد تفضيلاتك بعد."
      : intent.category === "all" ? "مكان متاح للاستكشاف في الرياض." : "يناسب نوع الطلعة الذي اخترته.";
    return {
      placeId: place.id, isPrimary: categoryMatch, basis, matchedPreferences, unconfirmedPreferences, explanation,
      signals: { categoryMatch, preferenceMatchCount: matchedPreferences.length, requestedPreferenceCount: requested.length, evidenceCount: insights?.evidenceCount ?? 0 },
    };
  }).sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || b.signals.preferenceMatchCount - a.signals.preferenceMatchCount || a.placeId.localeCompare(b.placeId, "en"));
}