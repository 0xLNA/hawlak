import type { InsightItem, PlaceInsights } from "./types";

/** Shared gate for rendering and matching.
 * The aggregation layer validates IDs against processed, non-demo experiences.
 */
export function usableInsights(insights: PlaceInsights | null | undefined): PlaceInsights | null {
  if (!insights || insights.provenance !== "extracted" || !Number.isInteger(insights.evidenceCount) || insights.evidenceCount < 1) return null;
  const supported = <T extends InsightItem>(items: T[]) => items.filter(item =>
    item.value.trim() && Number.isInteger(item.mentionCount) && item.mentionCount > 0 &&
    item.mentionCount <= insights.evidenceCount &&
    new Set(item.evidenceIds.filter(id => id.trim())).size === item.mentionCount);
  const result = { ...insights, vibe: supported(insights.vibe), bestFor: supported(insights.bestFor), positives: supported(insights.positives), complaints: supported(insights.complaints), popularItems: supported(insights.popularItems), timeContext: supported(insights.timeContext), preferences: supported(insights.preferences) };
  return [result.vibe, result.bestFor, result.positives, result.complaints, result.popularItems, result.timeContext, result.preferences].some(items => items.length) ? result : null;
}
