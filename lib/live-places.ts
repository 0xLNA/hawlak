import { getAggregatedInsights } from "./aggregated-insights";
import { getStarCounts } from "./place-signals";
import type { PlaceRecord } from "./types";

/** Keep metadata usable if either service is unavailable; never fabricate evidence. */
export async function withLiveSignals(places: PlaceRecord[]): Promise<PlaceRecord[]> {
  const ids = places.map(place => place.id);
  const [insights, stars] = await Promise.allSettled([getAggregatedInsights(ids), getStarCounts(ids)]);
  if (insights.status === "rejected") console.error("Place insights unavailable:", insights.reason);
  if (stars.status === "rejected") console.error("Place stars unavailable:", stars.reason);
  return places.map(place => ({ ...place,
    insights: insights.status === "fulfilled" ? insights.value.get(place.id) ?? null : null,
    starCount: stars.status === "fulfilled" ? stars.value.get(place.id) ?? 0 : undefined,
  }));
}
