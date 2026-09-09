import { test, expect, type Page } from "@playwright/test";

async function completeQuiz(page: Page, category = "خلّها مفتوحة") {
  await page.getByRole("button", { name: category, exact: true }).click();
  await page.getByRole("button", { name: "بدون تفضيلات", exact: true }).click();
}

test.beforeEach(async ({ page }) => {
  // OSM prohibits automated tile scanning. Browser tests use a local stand-in.
  await page.route("https://tile.openstreetmap.org/**", route => route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#e9ece5"/><path d="M0 128H256M128 0V256" stroke="#fff" stroke-width="10"/></svg>' }));
});

for (const width of [375, 390, 768, 1024, 1440]) {
  test(`intent, details, evidence and responsive layout at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "وش ودك اليوم؟" })).toBeVisible();
    await expect(page.locator(".map-shell")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`quiz-${width}.png`), fullPage: true });
    await page.getByRole("button", { name: "قهوة", exact: true }).click();
    await page.getByRole("button", { name: "هادئ", exact: true }).click();
    await page.getByRole("button", { name: "دراسة / عمل", exact: true }).click();
    await expect(page.locator(".map-shell")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`preferences-${width}.png`), fullPage: true });
    await page.getByRole("button", { name: "اعرض الأماكن على الخريطة" }).click();
    await expect(page.locator("#results-title")).toBeFocused();
    await expect(page.locator(".result-card").first().locator(".mini-score")).toHaveText("9.2");
    await expect(page.locator(".map-marker").first()).toBeAttached();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`home-${width}.png`), fullPage: true });
    await page.locator(".result-card").first().click();
    await expect(page.locator(".panel .match")).toContainText("9.2 / 10");
    await expect(page.getByRole("heading", { name: "لماذا يناسبك؟", exact: true })).toBeVisible();
    await page.locator(".why summary").click();
    await expect(page.locator(".breakdown")).toContainText("طابق 2 من 2");
    await expect(page.locator(".actions a")).toHaveAttribute("href", /destination=24\./);
    await page.getByRole("button", { name: "عرض المصادر", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.locator(".evidence-item")).toHaveCount(3);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "عرض المصادر", exact: true })).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`details-${width}.png`), fullPage: true });
    await page.getByRole("button", { name: "تحديد موقعي", exact: true }).scrollIntoViewIfNeeded();
    await expect(page.getByRole("button", { name: "تحديد موقعي", exact: true })).toBeVisible();
    const controlsUncovered = await page.getByRole("button", { name: "تحديد موقعي", exact: true }).evaluate(button => { const rect = button.getBoundingClientRect(); return button.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)); });
    expect(controlsUncovered).toBe(true);
    expect(errors).toEqual([]);
  });
}

test("save persists by place; category, search and empty states stay consistent", async ({ page }) => {
  await page.goto("/");
  await completeQuiz(page);
  await page.locator(".result-card").first().click();
  const placeName = await page.locator("#place-title").innerText();
  await page.getByRole("button", { name: "حفظ", exact: true }).click();
  await page.reload();
  await completeQuiz(page);
  await page.locator(".saved-filter").click();
  await expect(page.locator(".result-card")).toHaveCount(1);
  await expect(page.locator(".result-card h3")).toHaveText(placeName);
  await page.getByRole("textbox", { name: "ابحث عن مكان أو تجربة" }).fill("nothing-matches-this");
  await expect(page.locator(".empty")).toContainText("لا توجد نتائج مطابقة");
  await expect(page.locator(".map-marker")).toHaveCount(0);
  await page.getByRole("button", { name: "تغيير الاختيارات" }).click();
  for (const category of ["قهوة", "أكل", "حلا", "فعالية", "تمشية"]) {
    await completeQuiz(page, category);
    expect(await page.locator(".result-card").count()).toBeGreaterThan(0);
    for (const label of await page.locator(".result-category").allTextContents()) expect(label).toBe(category);
    await expect(page.getByRole("textbox")).toHaveValue("");
    await page.getByRole("button", { name: "تعديل الاختيارات" }).click();
  }
});

test("map markers follow zoom detail and remain clickable", async ({ page }) => {
  await page.goto("/");
  await completeQuiz(page, "قهوة");
  await page.locator(".result-card").first().click();
  await expect(page.locator(".marker-full").first()).toBeAttached();
  await page.getByRole("button", { name: "تصغير الخريطة", exact: true }).click();
  await expect(page.locator(".marker-full")).toHaveCount(0);
  await expect(page.locator(".marker-score").first()).toBeAttached();
  const scoreSize = await page.locator(".marker-score").first().boundingBox();
  expect(scoreSize?.width).toBe(44);
  expect(scoreSize?.height).toBe(44);
  await page.getByRole("button", { name: "تصغير الخريطة", exact: true }).click();
  await page.getByRole("button", { name: "تصغير الخريطة", exact: true }).click();
  await expect(page.locator(".marker-cluster").first()).toBeAttached();
  await page.locator(".marker-cluster").first().click();
  await expect(page.locator(".marker-score,.marker-full").first()).toBeAttached();
  await page.locator(".marker-score,.marker-full").first().click();
  await expect(page.locator("#place-title")).toBeVisible();
});

test("tile failure preserves local results", async ({ page }) => {
  await page.unroute("https://tile.openstreetmap.org/**");
  await page.route("https://tile.openstreetmap.org/**", route => route.abort());
  await page.goto("/");
  await completeQuiz(page);
  await expect(page.locator(".map-status")).toContainText("تعذر تحميل خلفية الخريطة");
  expect(await page.locator(".result-card").count()).toBeGreaterThan(0);
  await page.locator(".result-card").first().click();
  await expect(page.locator(".panel")).toBeVisible();
});

test("geolocation is requested explicitly and adds measured distances", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 24.69, longitude: 46.69 });
  await page.goto("/");
  await completeQuiz(page);
  await expect(page.locator(".result-card").first()).not.toContainText("كم بخط مستقيم");
  await page.getByRole("button", { name: "تحديد موقعي", exact: true }).click();
  await expect(page.locator(".map-status")).toContainText("تم تحديد موقعك");
  await expect(page.locator(".result-card").first()).toContainText("كم بخط مستقيم");
});

test("denied location shows actionable feedback and keeps discovery usable", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "geolocation", { value: { getCurrentPosition: (_success: unknown, fail: (error: { code: number }) => void) => fail({ code: 1 }) } });
  });
  await page.goto("/");
  await completeQuiz(page);
  await page.getByRole("button", { name: "تحديد موقعي", exact: true }).click();
  await expect(page.locator(".map-status")).toContainText("لم يُسمح بتحديد الموقع");
  expect(await page.locator(".result-card").count()).toBeGreaterThan(0);
});

test("quiz supports back, editing, cancellation and skipping preferences", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "قهوة", exact: true }).click();
  await expect(page.locator("#quiz-title")).toBeFocused();
  await page.getByRole("button", { name: "هادئ", exact: true }).click();
  await page.getByRole("button", { name: "السابق", exact: true }).click();
  await expect(page.getByRole("button", { name: "قهوة", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "قهوة", exact: true }).click();
  await expect(page.getByRole("button", { name: "هادئ", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "اعرض الأماكن على الخريطة" }).click();
  await expect(page.locator(".trip-summary")).toContainText("قهوة · هادئ");
  const names = await page.locator(".result-card h3").allTextContents();
  await page.getByRole("button", { name: "تعديل الاختيارات" }).click();
  await page.getByRole("button", { name: "أكل", exact: true }).click();
  await page.getByRole("button", { name: "العودة للخريطة" }).click();
  await expect(page.locator(".trip-summary")).toContainText("قهوة · هادئ");
  await expect(page.locator(".result-card h3")).toHaveText(names);
  await page.getByRole("button", { name: "تعديل الاختيارات" }).click();
  await completeQuiz(page, "أكل");
  await expect(page.locator(".trip-summary p")).toHaveText("أكل");
  await expect(page.locator(".result-card").first().locator(".mini-score")).toHaveText("5.0");
});

test("API uses shared ranking and validates invalid inputs", async ({ request }) => {
  const response = await request.get("/api/places?category=cafe");
  expect(response.ok()).toBe(true);
  const cafes = await response.json();
  expect(cafes.every((place: { category: string }) => place.category === "cafe")).toBe(true);
  expect((await request.get(`/api/places/${cafes[0].id}`)).status()).toBe(200);
  expect((await request.get("/api/places/missing")).status()).toBe(404);
  expect((await request.get("/api/places?category=__proto__")).status()).toBe(400);
  const ranked = await request.post("/api/recommend", { data: { category: "cafe", preferences: ["quiet", "work"] } });
  expect((await ranked.json())[0].score).toBe(9.2);
  expect((await request.post("/api/recommend", { data: { category: "cafe", preferences: ["invalid"] } })).status()).toBe(400);
  expect((await request.post("/api/recommend", { data: "{", headers: { "content-type": "application/json" } })).status()).toBe(400);
  expect((await request.post("/api/recommend", { data: "x".repeat(5000), headers: { "content-type": "application/json" } })).status()).toBe(413);
  expect((await request.post("/api/recommend", { data: "hello", headers: { "content-type": "text/plain" } })).status()).toBe(415);
});
