import test from "node:test";
import assert from "node:assert/strict";
import { getPlaces } from "../lib/places";
import { recommend } from "../lib/recommend";
import { parseIntent } from "../lib/intent";
import { clusterPoints, markerDetail } from "../lib/map-markers";
import { distanceKm } from "../lib/geo";

test("quiet/work cafes rank above incompatible cafes with truthful explanations", () => {
  const places = getPlaces();
  const result = recommend(places, { category: "cafe", preferences: ["quiet", "work"] });
  assert.ok(result.length > 1);
  assert.equal(result[0].score, 9.2);
  assert.deepEqual(result[0].matchedPreferences, ["quiet", "work"]);
  assert.ok(result.some(item => item.score === 5 && item.unmatchedPreferences.length === 2));
  assert.ok(result.every(item => places.find(place => place.id === item.placeId)?.category === "cafe"));
  assert.deepEqual(result, recommend([...places].reverse(), { category: "cafe", preferences: ["quiet", "work"] }));
});
test("duplicates do not inflate scores; no preferences means no claimed personalization", () => {
  const places = getPlaces();
  assert.deepEqual(recommend(places, { category: "all", preferences: ["quiet", "quiet"] }), recommend(places, { category: "all", preferences: ["quiet"] }));
  assert.ok(recommend(places, { category: "all", preferences: [] }).every(item => item.score === 5 && item.matchedPreferences.length === 0));
  assert.deepEqual(recommend([], { category: "all", preferences: [] }), []);
});
test("request validation rejects malformed profiles and prototype property names", () => {
  for (const value of [null, {}, [], { category: "toString", preferences: [] }, { category: "cafe", preferences: ["__proto__"] }, { category: "cafe", preferences: "quiet" }]) assert.equal(parseIntent(value), null);
  assert.deepEqual(parseIntent({ category: "cafe", preferences: ["quiet", "quiet"] }), { category: "cafe", preferences: ["quiet"] });
});
test("snapshot has real provenance, all categories, and separate counted demo evidence", () => {
  const places = getPlaces();
  assert.equal(new Set(places.map(place => place.id)).size, places.length);
  assert.equal(new Set(places.map(place => place.category)).size, 5);
  for (const place of places) {
    assert.match(place.metadataSource.url, /^https:\/\/www.openstreetmap.org\/(node|way|relation)\/\d+$/);
    assert.ok(place.latitude >= 24.63 && place.latitude <= 24.73);
    assert.ok(place.longitude >= 46.65 && place.longitude <= 46.75);
    assert.equal(place.rating, undefined); assert.equal(place.ratingCount, undefined); assert.equal(place.openNow, undefined);
    assert.equal(place.insights.evidenceCount, place.evidence.length);
    assert.ok(place.evidence.every(item => item.isDemo && !item.sourceUrl));
    assert.ok(!/[ØÙ]/.test(place.name), "Arabic must be decoded as UTF-8");
  }
});
test("marker detail changes at discrete thresholds and only nearby points cluster", () => {
  assert.equal(markerDetail(12), "compact"); assert.equal(markerDetail(13), "score"); assert.equal(markerDetail(15), "full");
  assert.deepEqual(clusterPoints([{ x: 0, y: 0 }, { x: 20, y: 20 }, { x: 200, y: 200 }]).map(group => group.length), [2, 1]);
  assert.equal(distanceKm([24.7, 46.7], [24.7, 46.7]), 0);
  assert.ok(Math.abs(distanceKm([0, 0], [0, 1]) - 111.195) < .01);
});
