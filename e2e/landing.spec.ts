import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const story = (page: Page) => page.locator("[data-mode]");
const activeStep = (page: Page) => page.locator("[data-step][data-active]");

test.describe("static mode (reduced motion)", () => {
  test.use({ reducedMotion: "reduce" });

  test("no canvas, no pins, every scene and CTA still there", async ({ page }) => {
    await page.goto("/vi");
    await expect(story(page)).toHaveAttribute("data-mode", "static");
    await expect(page.locator("canvas")).toHaveCount(0);
    for (const id of ["hero", "doors", "pets", "journey", "trust", "facts", "network", "stories", "partners", "final"]) {
      await expect(page.locator(`#scene-${id}`)).toBeAttached();
    }
    await expect(page.getByRole("link", { name: "Tìm thú cưng" })).toBeVisible();
  });

  test("the journey reads as six cards, each with its scene still and a link to its feature", async ({ page }) => {
    await page.goto("/vi");
    const steps = page.locator("[data-step]");
    await expect(steps).toHaveCount(6);
    for (const step of await steps.all()) {
      await expect(step).toBeVisible();
      await expect(step.locator("[data-feature-link]")).toHaveAttribute("href", /^\/vi\//);
    }
    await expect(steps.nth(2).locator("[data-feature-link]")).toHaveAttribute("href", "/vi/foster");
  });

  test("#journey-n anchors land on the right step card", async ({ page }) => {
    await page.goto("/vi#journey-3");
    await expect(page.locator("#journey-3")).toBeInViewport();
  });

  test("facts are only the three sourced numbers, each linked", async ({ page }) => {
    await page.goto("/vi");
    const facts = page.locator("#scene-facts li");
    await expect(facts).toHaveCount(3);
    for (const fact of await facts.all()) await expect(fact.getByRole("link")).toHaveAttribute("href", /^https:\/\//);
  });

  test("stories and partners are honest empty states", async ({ page }) => {
    await page.goto("/vi");
    await expect(page.locator("#scene-stories")).toContainText("với sự đồng ý của gia đình");
    await expect(page.locator("#scene-partners")).toContainText("sau khi được xác minh");
  });

  test("scene dots jump to a scene and move focus there", async ({ page }) => {
    await page.goto("/vi");
    const nav = page.getByRole("navigation", { name: "Các cảnh trong câu chuyện" });
    await expect(nav.getByRole("button")).toHaveCount(10);
    await nav.getByRole("button", { name: "Hành trình" }).click();
    await expect(page.locator("#scene-journey")).toBeFocused();
  });

  test("axe: landing in static mode", async ({ page }) => {
    await page.goto("/vi");
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
    const blocking = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(blocking.map((v) => `${v.id}: ${v.help} (${v.nodes[0]?.target})`)).toEqual([]);
  });
});

test.describe("animated mode (plate canvas)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/vi");
    const mode = await story(page).getAttribute("data-mode");
    test.skip(mode === "static", "no 2D canvas support here; covered by the static tests");
  });

  test("one labelled canvas behind the story (role=img + aria-label)", async ({ page }) => {
    const canvas = page.locator("canvas");
    await expect(canvas).toHaveCount(1);
    await expect(canvas).toHaveAttribute("role", "img");
    await expect(canvas).toHaveAttribute("aria-label", /Miu|ngôi nhà/);
  });

  test("pins at most two sections (v4: ≤ 2)", async ({ page }) => {
    await expect.poll(() => page.locator(".pin-spacer").count()).toBe(2);
  });

  test("next / previous step buttons move through the pinned journey", async ({ page }) => {
    await page.goto("/vi#journey-2");
    await expect(activeStep(page)).toHaveAttribute("data-index", "1", { timeout: 10_000 });
    await page.getByRole("button", { name: "Bước tiếp" }).click();
    await expect(activeStep(page)).toHaveAttribute("data-index", "2", { timeout: 10_000 });
    await page.getByRole("button", { name: "Bước trước" }).click();
    await expect(activeStep(page)).toHaveAttribute("data-index", "1", { timeout: 10_000 });
  });

  test("the Reduce effects toggle switches to static and is remembered", async ({ page }) => {
    const toggle = page.getByRole("button", { name: "Giảm hiệu ứng" });
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await toggle.click();
    await expect(story(page)).toHaveAttribute("data-mode", "static");
    await expect(page.locator("canvas")).toHaveCount(0);
    await page.reload();
    await expect(story(page)).toHaveAttribute("data-mode", "static");
  });
});

test.describe("every page knows its place in the journey", () => {
  const cases: Array<[string, RegExp, string | null]> = [
    ["/vi/pets", /Bước 4\/6 · Kết nối/, "/vi#journey-4"],
    ["/vi/foster", /Bước 3\/6 · Nuôi tạm/, "/vi#journey-3"],
    ["/vi/learn", /Bước 2\/6 · Chăm sóc thú y/, "/vi#journey-2"],
    ["/vi/volunteer", /Bước 1\/6 · Cứu hộ/, "/vi#journey-1"],
    ["/vi/stories", /Bước 6\/6 · Theo dõi/, "/vi#journey-6"],
    ["/vi/partners", /Toàn mạng lưới/, "/vi#scene-network"],
    ["/vi/map", /Toàn mạng lưới/, "/vi#scene-network"],
    ["/vi/events", /Toàn mạng lưới/, "/vi#scene-network"],
    ["/vi/donate", /Toàn mạng lưới/, "/vi#scene-network"],
    ["/vi/help", /Cần giúp ngay/, null],
    ["/vi/pets/HFA-0001", /Bước 4\/6/, "/vi#journey-4"],
  ];
  for (const [path, chip, back] of cases) {
    test(`${path}: chip and way back`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await expect(page.locator("[data-journey-chip]")).toHaveText(chip);
      if (back) await expect(page.getByRole("link", { name: "Quay lại hành trình" })).toHaveAttribute("href", back);
      else await expect(page.getByRole("link", { name: "Quay lại hành trình" })).toHaveCount(0);
    });
  }

  test("the chip opens the journey spine with the current step marked", async ({ page }) => {
    await page.goto("/vi/foster");
    await page.locator("[data-journey-chip]").click();
    const current = page.locator('[popover] a[aria-current="step"]');
    await expect(current).toBeVisible();
    await expect(current).toContainText("Nuôi tạm");
    await expect(current).toHaveAttribute("href", "/vi#journey-3");
  });

  test("/help has no scene header and no motion", async ({ page }) => {
    await page.goto("/vi/help");
    await expect(page.locator("[data-scene-header]")).toHaveCount(0);
    await expect(page.locator("[data-motion=none]")).toHaveCount(1);
  });
});
