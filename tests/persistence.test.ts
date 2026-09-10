import test from "node:test";
import assert from "node:assert/strict";
import { GET, POST } from "../app/api/places/[id]/star/route";
import { POST as submitExperience } from "../app/api/experiences/route";
import { getAggregatedPlaceInsights } from "../lib/aggregated-insights";
import { getPlaces } from "../lib/places";

test("server persists real stars, counts only stars and preserves reviews on extraction failure", async () => {
  const previousFetch = globalThis.fetch;
  const previousError = console.error;
  const envNames = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "ANTHROPIC_API_KEY"] as const;
  const previousEnv = Object.fromEntries(envNames.map(name => [name, process.env[name]]));
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://database.example.test";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-server-key";
  delete process.env.ANTHROPIC_API_KEY;
  console.error = () => {};
  const placeId = getPlaces()[0].id;
  const signals: { place_id: string; signal_type: string }[] = [];
  const reviews: Record<string, unknown>[] = [];
  let failCount = false;
  let failInsert = false;
  globalThis.fetch = async (input, options) => {
    const request = new Request(input, options);
    const url = new URL(request.url);
    assert.equal(url.origin, "https://database.example.test");
    if (url.pathname.endsWith("/place_signals")) {
      if (request.method === "POST") {
        if (failInsert) return Response.json({ message: "unavailable" }, { status: 503 });
        const signal = await request.json();
        assert.deepEqual(signal, { place_id: placeId, signal_type: "star" });
        signals.push(signal);
        return new Response(null, { status: 201 });
      }
      assert.equal(request.method, "HEAD");
      assert.equal(url.searchParams.get("signal_type"), "eq.star");
      assert.equal(url.searchParams.get("place_id"), `eq.${placeId}`);
      if (failCount) return new Response(null, { status: 503 });
      return new Response(null, { headers: { "content-range": `*/${signals.length}` } });
    }
    if (url.pathname.endsWith("/experiences")) {
      if (request.method === "POST") {
        const body = await request.json();
        reviews.push(body);
        return Response.json({ ...body, id: "saved-review", created_at: "2026-09-10T00:00:00Z" }, { status: 201 });
      }
      assert.equal(url.searchParams.get("source_type"), "eq.user_review");
      assert.equal(url.searchParams.get("processed"), "eq.true");
      return Response.json([{ id: "real-review", place_id: placeId }]);
    }
    if (url.pathname.endsWith("/extracted_insights")) {
      assert.equal(url.searchParams.get("experience_id"), "in.(real-review)");
      return Response.json([{ experience_id: "real-review", vibe: ["quiet"], best_for: ["study"], complaints: ["limited_parking"], positives: [], popular_items: [], time_context: [] }]);
    }
    throw new Error("Unexpected test request");
  };
  try {
    const context = { params: Promise.resolve({ id: placeId }) };
    const request = () => new Request(`http://localhost/api/places/${placeId}/star`);
    assert.deepEqual(await (await GET(request(), context)).json(), { placeId, starCount: 0 });
    const result = await POST(request(), context);
    assert.equal(result.status, 201);
    assert.deepEqual(await result.json(), { placeId, starCount: 1 });
    assert.deepEqual(await (await GET(request(), context)).json(), { placeId, starCount: 1 });
    failCount = true;
    const committed = await POST(request(), context);
    assert.equal(committed.status, 201);
    assert.equal((await committed.json()).starCount, null);
    assert.equal(signals.length, 2);
    failInsert = true;
    assert.equal((await POST(request(), context)).status, 503);
    assert.equal(signals.length, 2);
    const missing = { params: Promise.resolve({ id: "missing" }) };
    assert.equal((await POST(request(), missing)).status, 404);
    assert.equal((await GET(request(), missing)).status, 404);
    const insights = await getAggregatedPlaceInsights(placeId);
    assert.equal(insights?.evidenceCount, 1);
    assert.equal(insights?.provenance, "extracted");
    assert.equal(insights?.preferences.find(item => item.preference === "work")?.mentionCount, 1);
    const response = await submitExperience(new Request("http://localhost/api/experiences", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ placeId, rawText: "A real review kept even without extraction." }) }));
    assert.equal(response.status, 201);
    assert.equal((await response.json()).processed, false);
    assert.equal(reviews.length, 1);
    assert.equal(reviews[0].raw_text, "A real review kept even without extraction.");
    assert.equal(reviews[0].source_type, "user_review");
  } finally {
    globalThis.fetch = previousFetch;
    console.error = previousError;
    for (const name of envNames) {
      if (previousEnv[name] === undefined) delete process.env[name];
      else process.env[name] = previousEnv[name];
    }
  }
});
