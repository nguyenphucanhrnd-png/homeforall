import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const cards = (page: Page) => page.getByTestId("pet-card");

async function expectNoSeriousAxeIssues(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
  const blocking = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(blocking.map((v) => `${v.id}: ${v.help} (${v.nodes[0]?.target})`)).toEqual([]);
}

test.describe("A2: compare pets", () => {
  test("lists demo pets, each visibly labelled Demo", async ({ page }) => {
    await page.goto("/vi/pets");
    await expect(page.getByTestId("result-count")).toHaveText("12 bé phù hợp");
    await expect(cards(page)).toHaveCount(12);
    await expect(cards(page).getByText("Demo", { exact: true })).toHaveCount(12);
  });

  test("a filter updates the URL and the results, and can be cleared", async ({ page }) => {
    await page.goto("/vi/pets");
    await page.getByRole("checkbox", { name: "Chó", exact: true }).check();
    await expect(page).toHaveURL(/species=dog/);
    await expect(page.getByTestId("result-count")).toHaveText("5 bé phù hợp");
    for (const card of await cards(page).all()) await expect(card).toContainText("Chó ·");
    await expect(page.getByRole("checkbox", { name: "Chó", exact: true })).toBeFocused(); // focus not lost

    await page.getByRole("button", { name: /Xoá bộ lọc/ }).click();
    await expect(page).toHaveURL(/\/vi\/pets$/);
    await expect(cards(page)).toHaveCount(12);
  });

  test("filter state is deep-linkable", async ({ page }) => {
    await page.goto("/vi/pets?species=cat&ward=thu-duc");
    await expect(page.getByRole("checkbox", { name: "Mèo", exact: true })).toBeChecked();
    await expect(page.getByRole("checkbox", { name: "Thủ Đức" })).toBeChecked();
    for (const card of await cards(page).all()) {
      await expect(card).toContainText("Mèo ·");
      await expect(card).toContainText("Thủ Đức");
    }
  });

  test("stale listings are labelled and ranked last", async ({ page }) => {
    await page.goto("/vi/pets");
    const stale = cards(page).filter({ hasText: "Chưa xác nhận lại hơn 14 ngày" });
    await expect(stale).toHaveCount(2);
    await expect(cards(page).last()).toContainText("Chưa xác nhận lại hơn 14 ngày");
    await expect(cards(page).nth(9)).not.toContainText("Chưa xác nhận lại");
  });

  test("an empty result offers a next step", async ({ page }) => {
    await page.goto("/vi/pets?species=dog&age=senior");
    await expect(page.getByRole("heading", { name: "Chưa có bé nào khớp bộ lọc" })).toBeVisible();
    await page.getByRole("link", { name: "Xem tất cả" }).click();
    await expect(cards(page)).toHaveCount(12);
  });

  test("the account prompt appears on the second save, not the first", async ({ page }) => {
    await page.goto("/vi/pets");
    await page.getByRole("button", { name: "Lưu [Demo] Bông" }).click();
    await expect(page.getByText("Đăng nhập để giữ danh sách")).toHaveCount(0);
    await page.getByRole("button", { name: "Lưu [Demo] Đậu" }).click();
    await expect(page.getByText("Đăng nhập để giữ danh sách")).toBeVisible();
    await expect(page.getByRole("button", { name: "Đã lưu [Demo] Bông" })).toHaveAttribute("aria-pressed", "true");
  });

  test("axe: listing", async ({ page }) => {
    await page.goto("/vi/pets");
    await expectNoSeriousAxeIssues(page);
  });
});

test.describe("A1: arrive on a pet profile", () => {
  test("home → pet profile takes two clicks", async ({ page }) => {
    await page.goto("/vi");
    await page.getByRole("link", { name: "Tìm thú cưng" }).click();
    await page.getByRole("link", { name: "Xem hồ sơ [Demo] Mít" }).click();
    await expect(page).toHaveURL(/\/vi\/pets\/HFA-0001$/);
  });

  test("a shared link shows name, primary action, trust and safety", async ({ page }) => {
    await page.goto("/vi/pets/HFA-0001");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("[Demo] Mít");
    await expect(page.getByTestId("adopt-cta")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Giữ an toàn khi nhận nuôi" })).toBeVisible();
    await expect(page.getByText("3/4 bước chăm sóc cơ bản đã xong")).toBeVisible();

    await page.getByRole("button", { name: "Vì sao có huy hiệu này?" }).click();
    await expect(page.getByRole("note")).toBeVisible();
  });

  test("the lightbox pages with arrow keys and returns focus on Esc", async ({ page }) => {
    await page.goto("/vi/pets/HFA-0001");
    const opener = page.getByRole("button", { name: "Phóng to khung 1" });
    await opener.click();
    const dialog = page.getByRole("dialog");
    // 1 frame with a demo photo, 3 illustration frames without one.
    const counter = dialog.getByText(/^1 \/ \d+$/);
    await expect(counter).toBeVisible();
    const total = Number((await counter.textContent())!.split("/")[1]);
    if (total > 1) {
      await page.keyboard.press("ArrowRight");
      await expect(dialog.getByText(`2 / ${total}`)).toBeVisible();
    }
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("button", { name: `Phóng to khung ${total > 1 ? 2 : 1}` })).toBeFocused();
  });

  // The profile streams inside <Suspense>, so Next renders not-found with a
  // noindex tag but cannot change the already-sent 200 status.
  test("an unknown code shows not-found and is not indexed", async ({ page }) => {
    await page.goto("/vi/pets/HFA-9999");
    await expect(page.getByRole("heading", { name: "Không tìm thấy trang" })).toBeVisible();
    await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached();
  });

  test("axe: profile", async ({ page }) => {
    await page.goto("/vi/pets/HFA-0001");
    await expectNoSeriousAxeIssues(page);
  });
});

test.describe("A3 stage 1: express interest", () => {
  test("an empty submit lists each problem by field and focuses the summary", async ({ page }) => {
    await page.goto("/vi/pets/HFA-0001");
    await page.getByTestId("adopt-cta").click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Gửi mong muốn" }).click();
    const summary = dialog.getByRole("alert");
    await expect(summary).toBeFocused();
    await expect(summary).toContainText("Họ và tên:");
    await expect(summary).toContainText("Đồng ý chia sẻ thông tin:");
  });

  test("valid input succeeds and says honestly that nothing was sent", async ({ page }) => {
    await page.goto("/vi/pets/HFA-0001");
    await page.getByTestId("adopt-cta").click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Họ và tên").fill("Nguyễn Thị Linh");
    await dialog.getByLabel("Số điện thoại dùng Zalo").fill("0901234567");
    await dialog.getByLabel("Bạn sống ở phường/xã nào?").fill("Phường Diên Hồng");
    await dialog.getByRole("radio", { name: "Chưa từng" }).check();
    const consent = dialog.getByRole("checkbox");
    await expect(consent).not.toBeChecked(); // unticked by default (PDPL)
    await consent.check();
    await dialog.getByRole("button", { name: "Gửi mong muốn" }).click();
    await expect(dialog.getByTestId("interest-success")).toContainText("Bản demo");
  });

  test("a bad phone number is explained next to the field", async ({ page }) => {
    await page.goto("/vi/pets/HFA-0001");
    await page.getByTestId("adopt-cta").click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Số điện thoại dùng Zalo").fill("12345");
    await dialog.getByRole("button", { name: "Gửi mong muốn" }).click();
    await expect(dialog.getByText("Số điện thoại chưa đúng, ví dụ: 0901234567.").first()).toBeVisible();
  });

  test("the form keeps to six questions", async ({ page }) => {
    await page.goto("/vi/pets/HFA-0001");
    await page.getByTestId("adopt-cta").click();
    const dialog = page.getByRole("dialog");
    // name, contact (method + number), ward, experience, motivation, consent
    const questions = dialog.locator("form > div:has(label), form > fieldset");
    expect(await questions.count()).toBeLessThanOrEqual(7);
    await expectNoSeriousAxeIssues(page);
  });
});

test.describe("UI/UX audit regressions", () => {
  test("keyboard focus is never fully hidden under the sticky header (WCAG 2.2 focus-not-obscured)", async ({ page }) => {
    await page.goto("/vi/pets");
    await page.keyboard.press("End");
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    for (let i = 0; i < 60; i++) {
      await page.keyboard.press("Shift+Tab");
      const hidden = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body || el.closest("header") || el.matches("a[href='#main']")) return null;
        const r = el.getBoundingClientRect();
        const h = document.querySelector("header")!.getBoundingClientRect();
        return r.bottom <= h.bottom ? (el.getAttribute("aria-label") ?? el.textContent ?? el.tagName).slice(0, 40) : null;
      });
      expect(hidden, "focused element hidden under the header").toBeNull();
    }
  });

  test("closing the interest form keeps what was typed", async ({ page }) => {
    await page.goto("/vi/pets/HFA-0001");
    await page.getByTestId("adopt-cta").click();
    await page.getByRole("dialog").getByLabel("Họ và tên").fill("Nguyễn Thị Linh");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
    await page.getByTestId("adopt-cta").click();
    await expect(page.getByRole("dialog").getByLabel("Họ và tên")).toHaveValue("Nguyễn Thị Linh");
  });

  test("a field is validated when the user leaves it", async ({ page }) => {
    await page.goto("/vi/pets/HFA-0001");
    await page.getByTestId("adopt-cta").click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Số điện thoại dùng Zalo").fill("123");
    await page.keyboard.press("Tab");
    await expect(dialog.getByText("Số điện thoại chưa đúng, ví dụ: 0901234567.")).toBeVisible();
  });
});
