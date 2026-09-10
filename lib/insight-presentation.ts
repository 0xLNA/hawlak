import { usableInsights } from "./insights";
import type { InsightItem, PlaceInsights } from "./types";

const labels: Record<string, string> = {
  quiet: "هادئ", calm: "هادئ", lively: "حيوي", crowded: "مزدحم", cozy: "مريح",
  family_friendly: "مناسب للعائلة", study: "مناسب للدراسة", work: "مناسب للعمل",
  friends: "مناسب للأصدقاء", family: "مناسب للعائلة", date: "مناسب لطلعة ثنائية", solo: "مناسب للزيارة الفردية",
  limited_parking: "المواقف محدودة", crowded_evening: "مزدحم مساءً", slow_service: "الخدمة بطيئة",
  noise: "مزعج", high_price: "الأسعار مرتفعة", limited_seating: "الجلسات محدودة",
  good_value: "قيمة جيدة مقابل السعر", affordable: "أسعار مناسبة", good_coffee: "قهوة جيدة",
  morning: "الصباح", afternoon: "الظهر", evening: "المساء", late_night: "وقت متأخر",
};

export function formatInsightValue(value: string): string {
  return Object.hasOwn(labels, value) ? labels[value] : value.replaceAll("_", " ");
}

export function experienceCount(count: number): string {
  return count === 1 ? "تجربة واحدة" : count === 2 ? "تجربتين" : `${count} ${count <= 10 ? "تجارب" : "تجربة"}`;
}

/** Merge synonyms and cross-section repeats using unique evidence, never summed counts. */
function mergeItems(items: InsightItem[]): InsightItem[] {
  const grouped = new Map<string, Set<string>>();
  for (const item of items) {
    const label = formatInsightValue(item.value);
    const evidence = grouped.get(label) ?? new Set<string>();
    item.evidenceIds.forEach(id => evidence.add(id));
    grouped.set(label, evidence);
  }
  return [...grouped].map(([value, evidence]) => ({ value, evidenceIds: [...evidence], mentionCount: evidence.size }))
    .sort((a, b) => b.mentionCount - a.mentionCount || a.value.localeCompare(b.value, "ar"));
}

const negativeTags = new Set(["crowded", "crowded_evening", "limited_parking", "slow_service", "noise", "high_price", "limited_seating"]);

export function presentInsights(input: PlaceInsights | null) {
  const insights = usableInsights(input);
  if (!insights) return { summary: "لا توجد تجارب كافية بعد.", positives: [], negatives: [], popularItems: [], timeContext: [] };
  const observations = [...insights.vibe, ...insights.bestFor, ...insights.positives];
  const positives = mergeItems(observations.filter(item => !negativeTags.has(item.value))).slice(0, 4);
  const negatives = mergeItems([...insights.complaints, ...observations.filter(item => negativeTags.has(item.value))]).slice(0, 4);
  const highlights = [...new Set([
    mergeItems(insights.vibe.filter(item => !negativeTags.has(item.value)))[0]?.value,
    mergeItems(insights.bestFor.filter(item => !negativeTags.has(item.value)))[0]?.value,
  ].filter(Boolean))];
  if (!highlights.length) highlights.push(...positives.slice(0, 2).map(item => item.value));
  const summary = [
    highlights.length ? `من التجارب المتاحة: ${highlights.join("، ")}.` : "تتضمن التجارب المتاحة ملاحظات تساعدك على اختيار المكان.",
    negatives.length ? `خذ بالحسبان أن ${experienceCount(negatives[0].mentionCount)} أشارت إلى: ${negatives[0].value}.` : "",
  ].filter(Boolean).join(" ");
  return { summary, positives, negatives, popularItems: mergeItems(insights.popularItems).slice(0, 3), timeContext: mergeItems(insights.timeContext).slice(0, 2) };
}
