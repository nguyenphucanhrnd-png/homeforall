import { expect, test } from "@playwright/test";

test.describe("each feature page shows its own scene still", () => {
  const cases: Array<[string, string]> = [
    ["/vi/pets", "pets-header"],
    ["/vi/foster", "foster-header"],
    ["/vi/volunteer", "volunteer-header"],
    ["/vi/learn", "care-header"],
    ["/vi/stories", "stories-header"],
    ["/vi/partners", "partners-header"],
    ["/vi/about", "about-hero"],
    ["/vi/login", "login-door"],
  ];
  for (const [path, still] of cases) {
    test(`${path} → ${still}`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator(`[data-scene-header="${still}"]`)).toHaveCount(1);
    });
  }

  test("the pet profile has a mood strip but no scene", async ({ page }) => {
    await page.goto("/vi/pets/HFA-0001");
    await expect(page.locator("[data-mood-strip]")).toHaveCount(1);
    await expect(page.locator("[data-scene-header]")).toHaveCount(0);
  });
});

test("★F1 foster: offer a foster spot in under a minute (demo, nothing stored)", async ({ page }) => {
  await page.goto("/vi/foster");
  const form = page.locator("form");
  await form.getByRole("radio", { name: "Mèo", exact: true }).check();
  await form.getByRole("checkbox", { name: "Nhỏ" }).check();
  await form.getByRole("radio", { name: "2 – 8 tuần" }).check();
  await form.getByLabel("Bạn ở phường/xã nào?").fill("Phường Phú Mỹ");
  await form.getByLabel("Bắt đầu từ ngày").fill("2026-11-20");
  await form.getByLabel("Số điện thoại dùng Zalo hoặc email").fill("0901234567");
  const consent = form.getByRole("checkbox", { name: /Tôi đồng ý/ });
  await expect(consent).not.toBeChecked();
  await consent.check();
  await form.getByRole("button", { name: "Gửi" }).click();
  await expect(page.getByTestId("foster-success")).toContainText("Bản demo");
});

test("foster: missing answers are explained next to each field", async ({ page }) => {
  await page.goto("/vi/foster");
  await page.locator("form").getByRole("button", { name: "Gửi" }).click();
  await expect(page.locator("form").getByText("Vui lòng điền mục này.").first()).toBeVisible();
  await expect(page.locator("form").getByText("Cần sự đồng ý của bạn để đối tác có thể liên lạc.")).toBeVisible();
});

test("volunteer: tasks are labelled Demo, filterable, and sign-up is acknowledged honestly", async ({ page }) => {
  await page.goto("/vi/volunteer");
  const cards = page.getByTestId("task-card");
  await expect(cards).toHaveCount(5);
  await expect(cards.first()).toContainText("Demo");
  await page.getByRole("radio", { name: "Làm online" }).check({ force: true });
  await expect(cards).toHaveCount(1);
  await cards.first().getByRole("button", { name: "Tôi giúp được" }).click();
  await expect(cards.first()).toContainText("bản demo, chưa gửi đi");
});

test("about: an honest, visible note that the clay illustrations are AI-generated", async ({ page }) => {
  await page.goto("/vi/about");
  const note = page.locator("#illustrations");
  await expect(note).toBeVisible();
  await expect(note).toContainText("công cụ AI");
  await expect(note).toContainText("không phải thú cưng đang chờ nhận nuôi");
});

test("learn: found/bitten tiles hand over to /help; medical text is a marked placeholder", async ({ page }) => {
  await page.goto("/vi/learn");
  await expect(page.locator("#bitten a")).toHaveAttribute("href", "/vi/help#bite");
  await expect(page.locator("#found a")).toHaveAttribute("href", "/vi/help#found");
  await expect(page.locator('[data-placeholder="medical-review"]').first()).toBeVisible();
});
