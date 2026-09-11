import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  // Keep automated checks off the public tile service.
  await page.route("https://tile.openstreetmap.org/**", route => route.fulfill({
    contentType: "image/svg+xml",
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#e9eee2"/><path d="M0 128H256M128 0V256" stroke="#fff" stroke-width="10"/></svg>',
  }));
});

for (const width of [375, 768, 1440]) {
  test(`map discovery and controls stay usable at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto("/");
    await page.getByRole("button", { name: "بخصص تجربتي" }).click();
    await page.getByRole("button", { name: "قهوة", exact: true }).click();
    await page.getByRole("button", { name: "بدون تفضيلات", exact: true }).click();
    const cafeNames = await page.locator('.result-card[data-category="cafe"] h3').allTextContents();
    const pick = page.getByRole("button", { name: "اختار لي", exact: true });
    await expect(pick).toBeEnabled();
    await page.screenshot({ path: testInfo.outputPath(`explore-${width}.png`), fullPage: true, animations: "disabled" });
    await expect(page.locator(".destination-strip")).toHaveCount(0);
    const firstCard = page.locator(".result-card").first();
    const destinationName = await firstCard.locator("h3").innerText();
    await firstCard.click();
    await expect(page.locator("#place-title")).toHaveText(destinationName);
    await expect(page.locator(".map-marker.selected")).toHaveAttribute("aria-label", destinationName);
    const destinationId = await page.locator(".map-marker.selected").getAttribute("data-place-id");
    await expect(page.locator(".panel .destination-cover")).toBeVisible();
    await expect(page.getByRole("heading", { name: "ملخص المكان", exact: true })).toBeVisible();
    await expect(page.locator(".coordinates")).toHaveCount(0);
    await page.locator(".map-marker.selected").click();
    await expect(page.locator("#place-title")).toHaveText(destinationName);
    await page.getByRole("button", { name: "حفظ", exact: true }).click();
    await expect(page.getByRole("button", { name: "تم الحفظ", exact: true })).toHaveAttribute("aria-pressed", "true");
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("hawlak:saved:v1") || "[]"))).toContain(destinationId);
    await page.getByRole("button", { name: "تم الحفظ", exact: true }).click();
    await page.getByRole("button", { name: "إغلاق إشعار الحفظ", exact: true }).click();
    await page.getByRole("button", { name: "شارك تجربتك", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "شارك تجربتك", exact: true })).toBeFocused();
    await page.screenshot({ path: testInfo.outputPath(`details-${width}.png`), fullPage: true, animations: "disabled" });
    await pick.click();
    await expect(page.locator("#place-title")).toBeVisible();
    const first = await page.locator("#place-title").innerText();
    expect(cafeNames).toContain(first);
    await pick.click();
    await expect(page.locator("#place-title")).not.toHaveText(first);
    expect(cafeNames).toContain(await page.locator("#place-title").innerText());
    await expect(page.locator(".map-marker.selected .marker-category-icon")).toBeAttached();

    await page.getByRole("button", { name: "إخفاء القائمة", exact: true }).click();
    await expect(page.locator(".sidebar-reopen")).toBeFocused();
    await page.screenshot({ path: testInfo.outputPath(`map-${width}.png`), fullPage: true, animations: "disabled" });
    for (const button of [pick, page.getByRole("button", { name: "تحديد موقعي", exact: true }), page.getByRole("button", { name: "عرض جميع النتائج على الخريطة", exact: true }), page.locator(".sidebar-reopen")]) {
      await button.scrollIntoViewIfNeeded();
      expect(await button.evaluate(element => {
        const rect = element.getBoundingClientRect();
        return element.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
      })).toBe(true);
    }
    await page.getByRole("button", { name: "عرض جميع النتائج على الخريطة", exact: true }).click();
    await page.locator(".sidebar-reopen").click();
    await expect(page.locator("#place-title")).toBeFocused();
    await page.getByRole("textbox", { name: "ابحث عن مكان", exact: true }).fill("no-such-place-xyz");
    await expect(pick).toBeDisabled();
    await expect(page.locator(".map-marker")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}

for (const width of [375, 1440]) {
  test(`welcome paths and reset at ${width}px`, async ({ page, request }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "حياك الله محمد!" })).toBeVisible();
    await expect(page.locator(".map-shell,.quiz")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`welcome-${width}.png`), fullPage: true });
    await page.getByRole("button", { name: "حاب أكتشف" }).click();
    await expect(page.locator(".map-shell")).toBeVisible();
    await expect(page.locator(".quiz")).toHaveCount(0);
    const places = await (await request.get("/api/places")).json();
    await expect(page.locator(".result-card")).toHaveCount(places.length);
    await expect(page.locator("#results-title")).toBeFocused();
    await expect(page.locator(".trip-summary")).toContainText("كل الأماكن المتاحة");
    for (const label of await page.locator(".result-match").allTextContents()) expect(label).toBe("متاح للاستكشاف");
    const names = await page.locator(".result-card h3").allTextContents();
    await page.getByRole("button", { name: "تعديل الاختيارات" }).click();
    await page.getByRole("button", { name: "قهوة", exact: true }).click();
    await page.getByRole("button", { name: "هادئ", exact: true }).click();
    await page.getByRole("button", { name: "السابق", exact: true }).click();
    await expect(page.getByRole("heading", { name: "وش ودك اليوم؟" })).toBeVisible();
    await page.getByRole("button", { name: "العودة للخريطة" }).click();
    await expect(page.locator(".result-card h3")).toHaveText(names);
    await expect(page.locator(".trip-summary")).toContainText("كل الأماكن المتاحة");
    await page.getByRole("link", { name: "حولك، الصفحة الرئيسية" }).click();
    await expect(page.getByRole("heading", { name: "حياك الله محمد!" })).toBeVisible();
    const personalize = page.getByRole("button", { name: "بخصص تجربتي" });
    await personalize.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "وش ودك اليوم؟" })).toBeFocused();
    await page.getByRole("button", { name: "قهوة", exact: true }).click();
    await page.getByRole("button", { name: "هادئ", exact: true }).click();
    await page.getByRole("button", { name: "اعرض الأماكن على الخريطة" }).click();
    await expect(page.locator(".trip-summary")).toContainText("قهوة · هادئ");
    await expect(page.locator(".map-shell")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
