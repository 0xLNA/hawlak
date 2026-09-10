import test from "node:test";
import assert from "node:assert/strict";
import { recommend } from "../lib/recommend";
import { getPlaces } from "../lib/places";
import { parseIntent } from "../lib/intent";
import { parseExperience } from "../lib/experience-input";
import { clusterPoints, markerDetail } from "../lib/map-markers";
import { distanceKm } from "../lib/geo";
import { usableInsights } from "../lib/insights";
import { formatInsightValue, presentInsights } from "../lib/insight-presentation";
import type { PlaceInsights, PlaceRecord } from "../lib/types";

function insights(count: number): PlaceInsights {
  const evidenceIds = Array.from({ length: count }, (_, i) => `real-${i}`);
  const item = (value: string) => ({ value, mentionCount: count, evidenceIds });
  return { provenance: "extracted", evidenceCount: count, vibe: [item("quiet"), item("calm")], bestFor: [item("study")], positives: [], complaints: [item("limited_parking")], popularItems: [], timeContext: [], preferences: [{ ...item("quiet"), preference: "quiet" }, { ...item("work"), preference: "work" }] };
}
const place = (count: number, stars = 0): PlaceRecord => ({ ...getPlaces().find(p => p.category === "cafe")!, insights: count ? insights(count) : null, starCount: stars });
const intent = { category: "cafe" as const, preferences: ["quiet" as const, "work" as const] };

test("real evidence gates numeric scores at three experiences", () => {
  for (const count of [0, 1, 2]) assert.equal(recommend([place(count, 100)], intent)[0].score, null);
  assert.equal(recommend([place(3)], intent)[0].score, 84.5);
  assert.equal(recommend([place(10, 10)], intent)[0].score, 100);
});

test("stars have diminishing returns, add at most five points and never beat intent", () => {
  const scores = [0, 1, 3, 10, 1000].map(stars => recommend([place(10, stars)], intent)[0].rankingScore);
  assert.equal(scores[0], 95);
  assert.ok(scores[1] > scores[0] && scores[2] > scores[1]);
  assert.equal(scores[3], 100); assert.equal(scores[4], 100);
  assert.ok(Math.abs(scores[1] - scores[0] - 5 * Math.log10(2) / Math.log10(11)) < 1e-10);
  const mismatched = { ...place(10, 1000), id: "other", category: "restaurant" as const };
  assert.equal(recommend([mismatched, place(3)], intent)[0].placeId, place(3).id);
  assert.equal(recommend([{ ...place(10, 1000), id: "popular", insights: { ...insights(10), preferences: [] } }, place(3)], intent)[0].placeId, place(3).id);
});

test("duplicates do not inflate matches; no selected preferences makes no claim", () => {
  const places = [place(3), { ...place(3), id: "second" }];
  assert.deepEqual(recommend(places, { category: "all", preferences: ["quiet", "quiet"] }), recommend(places, { category: "all", preferences: ["quiet"] }));
  assert.deepEqual(recommend(places, intent), recommend([...places].reverse(), intent));
  assert.equal(recommend([place(10)], { category: "all", preferences: [] })[0].score, 55);
  assert.deepEqual(recommend([], intent), []);
});

test("summary contains only supported observations, merges synonyms and counts unique sources", () => {
  assert.equal(presentInsights(null).summary, "لا توجد تجارب كافية بعد.");
  const result = presentInsights(insights(1));
  assert.match(result.summary, /هادئ/);
  assert.match(result.summary, /مناسب للدراسة/);
  assert.match(result.summary, /المواقف محدودة/);
  assert.equal(result.positives.filter(item => item.value === "هادئ").length, 1);
  assert.equal(result.positives[0].mentionCount, 1);
  assert.equal(result.negatives[0].mentionCount, 1);
  assert.equal(formatInsightValue("unknown_tag"), "unknown tag");
  assert.equal(usableInsights({ ...insights(3), provenance: "demo" }), null);
  assert.equal(usableInsights({ ...insights(3), vibe: [], bestFor: [], preferences: [], complaints: [], timeContext: [{ value: "evening", mentionCount: 9, evidenceIds: ["bad"] }] }), null);
});

test("500-character raw reviews accepted, 501 rejected including whitespace", () => {
  const rawText = "ج".repeat(500);
  assert.equal(parseExperience({ placeId: "place", rawText })?.rawText, rawText);
  assert.equal(parseExperience({ placeId: "place", rawText: rawText + " " }), null);
  assert.equal(parseExperience({ placeId: "place", rawText: "short" }), null);
});

test("request validation rejects malformed profiles and prototype property names", () => {
  for (const value of [null, {}, [], { category: "toString", preferences: [] }, { category: "cafe", preferences: ["__proto__"] }, { category: "cafe", preferences: "quiet" }]) assert.equal(parseIntent(value), null);
  assert.deepEqual(parseIntent({ category: "cafe", preferences: ["quiet", "quiet"] }), { category: "cafe", preferences: ["quiet"] });
});

test("production metadata contains no demo evidence or synthetic ratings", () => {
  const places = getPlaces();
  assert.equal(new Set(places.map(place => place.id)).size, places.length);
  assert.equal(new Set(places.map(place => place.category)).size, 5);
  for (const place of places) {
    assert.match(place.metadataSource.url, /^https:\/\/www.openstreetmap.org\/(node|way|relation)\/\d+$/);
    assert.equal(place.insights, null);
    assert.ok(!("rating" in place)); assert.ok(!("ratingCount" in place));
    assert.ok(!/[ØÙ]/.test(place.name));
  }
});

test("marker clustering and measured distances retain their behavior", () => {
  assert.equal(markerDetail(12), "compact"); assert.equal(markerDetail(13), "pin"); assert.equal(markerDetail(15), "full");
  assert.deepEqual(clusterPoints([{ x: 0, y: 0 }, { x: 20, y: 20 }, { x: 200, y: 200 }]).map(group => group.length), [2, 1]);
  assert.equal(distanceKm([24.7, 46.7], [24.7, 46.7]), 0);
  assert.ok(Math.abs(distanceKm([0, 0], [0, 1]) - 111.195) < .01);
});
