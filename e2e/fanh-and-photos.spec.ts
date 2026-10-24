import { existsSync } from "node:fs";
import { join } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("the emergency entry reads 'Bạn thấy 1 bé lạc?' and still opens /help", async ({ page }) => {
  await page.goto("/vi/pets");
  const entry = page.getByTestId("emergency-link");
  await expect(entry).toHaveText("Bạn thấy 1 bé lạc?");
  await entry.click();
  await expect(page).toHaveURL(/\/vi\/help$/);
});

test.describe("Fanh the vet (UI only)", () => {
  test("opens, answers honestly with links, and Esc returns focus to the launcher", async ({ page }) => {
    await page.goto("/vi/pets");
    const launcher = page.getByTestId("fanh-launcher");
    await launcher.click();
    const chat = page.getByRole("dialog", { name: "Fanh the vet" });
    await expect(chat).toBeVisible();
    await expect(chat).toContainText("không thay thế bác sĩ thú y");
    await expect(chat.getByRole("textbox", { name: "Câu hỏi cho Fanh" })).toBeFocused();

    await chat.getByRole("button", { name: "Bé mới về nhà cần chuẩn bị gì?" }).click();
    await expect(chat.getByRole("log")).toContainText("đang được hoàn thiện");
    await expect(chat.getByRole("link", { name: "Trang Chăm sóc" })).toHaveAttribute("href", "/vi/learn");

    await page.keyboard.press("Escape");
    await expect(chat).toBeHidden();
    await expect(launcher).toBeFocused();
  });

  test("typing a question and pressing Enter sends it", async ({ page }) => {
    await page.goto("/vi/learn");
    await page.getByTestId("fanh-launcher").click();
    const box = page.getByRole("textbox", { name: "Câu hỏi cho Fanh" });
    await box.fill("Mèo con mấy tháng thì triệt sản?");
    await box.press("Enter");
    const log = page.getByRole("log");
    await expect(log).toContainText("Mèo con mấy tháng thì triệt sản?");
    await expect(log).toContainText("đang được hoàn thiện");
  });

  test("is not shown on /help (calm, no distractions)", async ({ page }) => {
    await page.goto("/vi/help");
    await expect(page.getByTestId("fanh-launcher")).toHaveCount(0);
  });

  test("axe: open chat has no serious issues", async ({ page }) => {
    await page.goto("/vi/pets");
    await page.getByTestId("fanh-launcher").click();
    const { violations } = await new AxeBuilder({ page }).include('[role="dialog"]').analyze();
    expect(violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id)).toEqual([]);
  });
});

test.describe("demo pet photos", () => {
  const hasPhotos = existsSync(join(process.cwd(), "public/assets/demo-pets/HFA-0001.webp"));
  test.skip(!hasPhotos, "demo photos are git-ignored; illustrations are used instead");

  test("cards and the profile show the photo with a 'demo photo' alt", async ({ page }) => {
    await page.goto("/vi/pets");
    await expect(page.getByTestId("pet-card").locator("img")).toHaveCount(12);
    await expect(page.getByRole("img", { name: "Ảnh bé [Demo] Mít (ảnh demo)" })).toBeVisible();
    await page.goto("/vi/pets/HFA-0001");
    await expect(page.getByRole("img", { name: /Ảnh bé \[Demo\] Mít \(ảnh demo\), tấm 1/ }).first()).toBeVisible();
  });
});
