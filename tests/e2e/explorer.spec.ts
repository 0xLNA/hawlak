import { test, expect, type Page } from "@playwright/test";
import { getPlaces } from "../../lib/places";
import type { PlaceInsights } from "../../lib/types";

function insights(count: number): PlaceInsights | null {
  if (!count) return null;
  const evidenceIds = Array.from({ length: count }, (_, i) => `test-${i}`);
  const item = (value: string) => ({ value, mentionCount: count, evidenceIds });
  return { provenance: "extracted", evidenceCount: count, vibe: [item("quiet")], bestFor: [item("study")], positives: [item("good_coffee")], complaints: [item("limited_parking")], popularItems: [], timeContext: [], preferences: [{ ...item("quiet"), preference: "quiet" }, { ...item("work"), preference: "work" }] };
}
async function setup(page: Page, initialCount = 0) {
  let count = initialCount;
  let stars = 0;
  let posts = 0;
  await page.route("https://tile.openstreetmap.org/**", route => route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#e9ece5"/></svg>' }));
  await page.route("**/api/places", route => route.fulfill({ json: getPlaces().map(place => ({ ...place, insights: insights(count), starCount: stars })) }));
  await page.route("**/api/places/*/insights", route => route.fulfill({ json: { insights: insights(count) } }));
  await page.route("**/api/places/*/star", route => {
    if (route.request().method() === "POST") { stars++; posts++; }
    return route.fulfill({ status: route.request().method() === "POST" ? 201 : 200, json: { starCount: stars } });
  });
  await page.route("**/api/experiences", route => { count++; return route.fulfill({ status: 201, json: { processed: true } }); });
  return { posts: () => posts };
}
async function openPlace(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "قهوة", exact: true }).click();
  await page.getByRole("button", { name: "هادئ", exact: true }).click();
  await page.getByRole("button", { name: "دراسة / عمل", exact: true }).click();
  await page.getByRole("button", { name: "اعرض الأماكن على الخريطة" }).click();
  await page.locator(".result-card").first().click();
  await expect(page.locator("#place-title")).toBeVisible();
  await expect(page.locator(".place-summary")).toHaveAttribute("aria-busy", "false");
}

for (const width of [375, 390, 768, 1024, 1440]) {
  test(`real summary and RTL pros/cons at ${width}px`, async ({ page }, testInfo) => {
    await setup(page, 1);
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await openPlace(page);
    await expect(page.locator(".trip-summary")).toContainText("طلعتك على جوك");
    await expect(page.locator(".place-summary")).toContainText("مبني على تجربة واحدة");
    await expect(page.locator(".place-summary")).toContainText("هادئ");
    await expect(page.locator(".insight-positive")).toContainText("مناسب للدراسة");
    await expect(page.locator(".insight-negative")).toContainText("المواقف محدودة");
    await expect(page.locator(".insight-negative")).toContainText("ورد في تجربة واحدة");
    await expect(page.locator(".match > b")).toHaveText("بيانات أولية");
    const positive = (await page.locator(".insight-positive").boundingBox())!;
    const negative = (await page.locator(".insight-negative").boundingBox())!;
    if (width < 768) { expect(positive.y).toBeLessThan(negative.y); expect(positive.x).toBe(negative.x); }
    else { expect(positive.x).toBeGreaterThan(negative.x); expect(positive.y).toBe(negative.y); }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.locator(".actions a")).toHaveAttribute("href", /destination=24\./);
    await expect(page.locator(".map-marker").first()).toBeAttached();
    await page.getByRole("button", { name: "تحديد موقعي", exact: true }).scrollIntoViewIfNeeded();
    expect(await page.getByRole("button", { name: "تحديد موقعي", exact: true }).evaluate(button => { const r = button.getBoundingClientRect(); return button.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); })).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`details-${width}.png`), fullPage: true });
    expect(errors).toEqual([]);
  });
}

test("no experiences means no numeric score, invented evidence or zero popularity badge", async ({ page }) => {
  await setup(page);
  await openPlace(page);
  await expect(page.locator(".place-summary")).toContainText("لا توجد تجارب كافية بعد.");
  await expect(page.locator(".match > b")).toHaveText("بيانات أولية");
  await expect(page.locator(".decision-grid")).toHaveCount(0);
  await expect(page.locator(".star-button b")).toHaveCount(0);
});

test("star is distinct from save, persists across refresh and changes score only lightly", async ({ page }) => {
  const state = await setup(page, 3);
  await openPlace(page);
  const before = Number((await page.locator(".match > b").innerText()).split(" / ")[0]);
  await page.getByRole("button", { name: "مميز", exact: true }).click();
  await expect(page.locator(".star-button")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".star-button b")).toHaveText("1");
  const after = Number((await page.locator(".match > b").innerText()).split(" / ")[0]);
  expect(after - before).toBeGreaterThan(0); expect(after - before).toBeLessThan(5);
  await expect(page.getByRole("button", { name: "حفظ", exact: true })).toHaveAttribute("aria-pressed", "false");
  await openPlace(page);
  await expect(page.locator(".star-button")).toBeDisabled();
  await expect(page.locator(".star-button")).toHaveAttribute("aria-pressed", "true");
  expect(state.posts()).toBe(1);
});

test("experience closes dialog and refreshes evidence, summary and score without navigation", async ({ page }) => {
  await setup(page, 2);
  await openPlace(page);
  await expect(page.locator(".match > b")).toHaveText("بيانات أولية");
  let navigations = 0;
  page.on("framenavigated", frame => { if (frame === page.mainFrame()) navigations++; });
  await page.getByRole("button", { name: "شارك تجربتك", exact: true }).click();
  const textarea = page.locator("#experience-text");
  await expect(textarea).toHaveAttribute("maxlength", "500");
  await textarea.fill("مكان هادئ ومناسب للدراسة لكن المواقف محدودة");
  await expect(page.locator("#experience-length")).toContainText("/ 500");
  await page.getByRole("button", { name: "إرسال التجربة", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".place-summary")).toContainText("مبني على 3 تجارب");
  await expect(page.locator(".insight-negative")).toContainText("ورد في 3 تجارب");
  await expect(page.locator(".match > b")).toContainText("84.5 / 100");
  expect(navigations).toBe(0);
});

test("saved raw review still succeeds when extraction fails", async ({ page }) => {
  await setup(page);
  await page.route("**/api/experiences", route => route.fulfill({ status: 201, json: { processed: false } }));
  await openPlace(page);
  await page.getByRole("button", { name: "شارك تجربتك", exact: true }).click();
  await page.locator("#experience-text").fill("هذه تجربة حقيقية في المكان");
  await page.getByRole("button", { name: "إرسال التجربة", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".submission-notice")).toContainText("تم حفظ تجربتك");
  await expect(page.locator(".place-summary")).toContainText("لا توجد تجارب كافية بعد.");
});

test("save and sidebar controls retain their independent behavior", async ({ page }) => {
  await setup(page);
  await openPlace(page);
  await page.getByRole("button", { name: "حفظ", exact: true }).click();
  await page.getByRole("button", { name: "إخفاء القائمة", exact: true }).click();
  await page.getByRole("button", { name: "عرض القائمة", exact: true }).click();
  await expect(page.locator("#place-title")).toBeVisible();
  await openPlace(page);
  await expect(page.getByRole("button", { name: "تم الحفظ", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".star-button")).toHaveAttribute("aria-pressed", "false");
});

test("API rejects unknown places and reviews longer than 500 before persistence", async ({ request }) => {
  const id = getPlaces()[0].id;
  expect((await request.post("/api/experiences", { data: { placeId: id, rawText: "x".repeat(501) } })).status()).toBe(400);
  expect((await request.get("/api/places/missing/star")).status()).toBe(404);
  expect((await request.post("/api/places/missing/star")).status()).toBe(404);
  expect((await request.post("/api/recommend", { data: { category: "cafe", preferences: ["invalid"] } })).status()).toBe(400);
});
