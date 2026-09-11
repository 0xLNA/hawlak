import { test, expect, type Page } from "@playwright/test";
import type { PlaceInsights } from "../../lib/types";
import { usableInsights } from "../../lib/insights";

// Network fixtures belong only in tests; production uses persisted extractions.
function insights(): PlaceInsights {
  const item = (value: string) => ({ value, mentionCount: 1, evidenceIds: ["test-review"] });
  return { provenance: "extracted", evidenceCount: 1, vibe: [item("هادئ")], bestFor: [], positives: [item("قهوة ممتازة")], complaints: [item("مواقف محدودة")], popularItems: [], timeContext: [], preferences: [] };
}

test.beforeEach(async ({ page }) => {
  await page.route("https://tile.openstreetmap.org/**", route => route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"/>' }));
});

async function openPlace(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "حاب أكتشف" }).click();
  await page.locator(".result-card").first().click();
  await expect(page.locator("#place-title")).toBeVisible();
}

async function submitReview(page: Page) {
  await page.getByRole("button", { name: "شارك تجربتك", exact: true }).click();
  await page.locator("#experience-text").fill("مكان هادئ والقهوة ممتازة لكن المواقف محدودة");
  await page.getByRole("button", { name: "إرسال التجربة", exact: true }).click();
}

test("initial page displays existing server-aggregated insights", async ({ page }) => {
  await openPlace(page);
  const placeId = await page.locator(".map-marker.selected").getAttribute("data-place-id");
  expect(placeId).toBeTruthy();
  const response = await page.request.get(`/api/places/${encodeURIComponent(placeId!)}/insights`);
  expect(response.ok()).toBe(true);
  const current = usableInsights((await response.json()).insights);
  if (current) {
    await expect(page.locator(".insight-provenance")).toHaveText(`من ${current.evidenceCount} تجارب متاحة`);
    const summary = [...current.vibe, ...current.bestFor].map(item => item.value).slice(0, 3).join(" · ");
    if (summary) await expect(page.locator(".place-summary p")).toHaveText(summary);
  } else {
    await expect(page.locator(".place-summary p")).toHaveText("لا توجد تجارب كافية بعد.");
  }
});

test("successful review closes before refetch completes and updates the selected place without navigation", async ({ page }) => {
  const requests: string[] = [];
  let release: () => void = () => {};
  const waiting = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/experiences", route => { requests.push("review"); return route.fulfill({ status: 201, json: { processed: true } }); });
  await page.route("**/api/places/*/insights", async route => {
    requests.push("insights");
    await waiting;
    const placeId = decodeURIComponent(new URL(route.request().url()).pathname.split("/")[3]);
    await route.fulfill({ json: { placeId, insights: insights() } });
  });
  await openPlace(page);
  const name = await page.locator("#place-title").innerText();
  let navigations = 0;
  page.on("framenavigated", frame => { if (frame === page.mainFrame()) navigations++; });
  try {
    await submitReview(page);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect.poll(() => requests).toEqual(["review", "insights"]);
  } finally { release(); }
  await expect(page.locator(".place-summary")).toContainText("هادئ");
  await expect(page.locator(".insight-section.positive")).toContainText("قهوة ممتازة");
  await expect(page.locator(".insight-section.negative")).toContainText("مواقف محدودة");
  await expect(page.locator("#place-title")).toHaveText(name);
  await page.getByRole("button", { name: "العودة إلى النتائج", exact: true }).click();
  await page.locator(".result-card").filter({ has: page.getByRole("heading", { name, exact: true }) }).click();
  await expect(page.locator(".place-summary")).toContainText("هادئ");
  expect(navigations).toBe(0);
});

for (const provenance of ["empty", "demo"] as const) {
  test(`${provenance} insights retain the Arabic empty state after a saved review`, async ({ page }) => {
    await page.route("**/api/experiences", route => route.fulfill({ status: 201, json: { processed: false } }));
    await page.route("**/api/places/*/insights", route => route.fulfill({ json: {
      placeId: decodeURIComponent(new URL(route.request().url()).pathname.split("/")[3]),
      insights: provenance === "empty" ? null : { ...insights(), provenance: "demo" },
    } }));
    await openPlace(page);
    await submitReview(page);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.locator(".submission-notice")).toHaveText("تم حفظ تجربتك. شكرًا لمشاركتك.");
    await expect(page.locator(".place-summary")).toContainText("لا توجد تجارب كافية بعد.");
    await expect(page.locator(".insights")).toHaveCount(0);
  });
}

test("refresh failure preserves existing insights and does not report a failed review", async ({ page }) => {
  await page.route("**/api/experiences", route => route.fulfill({ status: 201, json: { processed: true } }));
  await page.route("**/api/places/*/insights", route => route.fulfill({ status: 503, json: { error: "unavailable" } }));
  await openPlace(page);
  const summary = await page.locator(".place-summary").innerText();
  await submitReview(page);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".submission-notice")).toContainText("تم حفظ تجربتك، لكن تعذر تحديث");
  await expect(page.locator(".place-summary")).toHaveText(summary, { useInnerText: true });
});

test("local stars toggle, persist, and leave insights, saved places, ranking and network untouched", async ({ page }) => {
  await openPlace(page);
  const requests: string[] = [];
  page.on("request", request => { if (/\/api\/|supabase/i.test(request.url())) requests.push(request.url()); });
  const summary = await page.locator(".place-summary").innerText();
  const match = await page.locator(".detail-match").innerText();
  await page.getByRole("button", { name: "العودة إلى النتائج", exact: true }).click();
  const order = await page.locator(".result-card h3").allTextContents();
  await page.locator(".result-card").first().click();
  const star = page.locator(".star-button");
  await expect(star).toHaveAttribute("aria-pressed", "false");
  await expect(star.locator("svg")).toHaveAttribute("fill", "none");
  await star.click();
  await expect(star).toHaveAttribute("aria-pressed", "true");
  await expect(star.locator("svg")).toHaveAttribute("fill", "currentColor");
  await expect(page.getByRole("button", { name: "حفظ", exact: true })).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator(".place-summary")).toHaveText(summary, { useInnerText: true });
  await expect(page.locator(".detail-match")).toHaveText(match);
  await page.getByRole("button", { name: "العودة إلى النتائج", exact: true }).click();
  await expect(page.locator(".result-card h3")).toHaveText(order);
  expect(requests).toEqual([]);
  await openPlace(page);
  await expect(star).toHaveAttribute("aria-pressed", "true");
  await star.click();
  await expect(star).toHaveAttribute("aria-pressed", "false");
  await openPlace(page);
  await expect(star).toHaveAttribute("aria-pressed", "false");
  expect(requests).toEqual([]);
});
