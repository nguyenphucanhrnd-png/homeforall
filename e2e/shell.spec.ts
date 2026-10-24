import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const VI_SAMPLE = "Ắ Ằ Ẳ Ẵ Ặ Ề Ể Ễ Ệ Ổ Ỗ Ộ Ờ Ở Ỡ Ợ Ữ Ự Ỳ Ỷ Ỹ Ỵ";

test("the root redirects to Vietnamese", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/vi$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "vi");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Từ cứu hộ đến mái ấm trọn đời");
});

test("skip link is the first focusable element and moves focus to main", async ({ page }) => {
  await page.goto("/vi");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Bỏ qua, đến nội dung chính" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main$/);
});

for (const path of ["/vi", "/vi/pets", "/vi/login", "/en/partners"]) {
  test(`/help is one click away from ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.getByTestId("emergency-link").click();
    await expect(page).toHaveURL(/\/(vi|en)\/help$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
}

test("/help needs no login and has both situation tiles", async ({ page }) => {
  await page.goto("/vi/help");
  await expect(page.getByRole("link", { name: /bị chó, mèo cắn/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /nhặt được một bé/ })).toBeVisible();
  await expect(page.locator("[data-motion=none]")).toHaveCount(1);
});

test("language switch keeps the current page", async ({ page }) => {
  await page.goto("/vi/help");
  await page.getByRole("link", { name: "English" }).click();
  await expect(page).toHaveURL(/\/en\/help$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("dashboards send anonymous visitors to login and remember where they were", async ({ page }) => {
  await page.goto("/vi/dashboard/rescue");
  await expect(page).toHaveURL(/\/vi\/login\?next=%2Fvi%2Fdashboard%2Frescue$/);
});

test("heading and body fonts cover Vietnamese glyphs", async ({ page }) => {
  await page.goto("/vi");
  const result = await page.evaluate(async (sample) => {
    const familyOf = (sel: string) => getComputedStyle(document.querySelector(sel)!).fontFamily.split(",")[0];
    const heading = familyOf("h1");
    const body = familyOf("p");
    const [h, b] = await Promise.all([
      document.fonts.load(`700 40px ${heading}`, sample),
      document.fonts.load(`400 16px ${body}`, sample),
    ]);
    return { heading, body, headingFaces: h.length, bodyFaces: b.length };
  }, VI_SAMPLE);
  expect(result.heading).toMatch(/Baloo/i);
  expect(result.body).toMatch(/Nunito/i);
  expect(result.headingFaces).toBeGreaterThan(0);
  expect(result.bodyFaces).toBeGreaterThan(0);
});

// v4 §10: the header must never cause horizontal scroll, at any width.
for (const width of [375, 768, 1024, 1280, 1440, 1920]) {
  test(`no horizontal scroll at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/vi", "/vi/help", "/en", "/vi/pets", "/vi/pets/HFA-0001"]) {
      await page.goto(path);
      await page.evaluate(() => document.fonts.ready);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });
}

test("the header fits on one row at 1280px", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/vi");
  const height = await page.locator("header").evaluate((el) => el.getBoundingClientRect().height);
  expect(height).toBeLessThan(100);
});

for (const path of ["/vi", "/en", "/vi/help", "/vi/login", "/vi/pets"]) {
  test(`axe: no serious or critical issues on ${path}`, async ({ page }) => {
    await page.goto(path);
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
    const blocking = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(blocking.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
}

test("after navigating, focus moves to the main content", async ({ page }) => {
  await page.goto("/vi/help");
  await page.getByRole("navigation", { name: "Điều hướng chính" }).getByRole("link", { name: "Nhận nuôi" }).click();
  await expect(page).toHaveURL(/\/vi\/pets$/);
  await expect(page.locator("#main")).toBeFocused();
});
