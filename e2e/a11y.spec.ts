import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Accessibility", () => {
  test("main views should have no critical accessibility violations", async ({ page }) => {
    await page.goto("/");
    // Basic smoke for core panels visible
    await expect(page.getByRole("heading", { name: "Providers" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Files" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Editor (Monaco)" })).toBeVisible();

    const axe = new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]);
    const results = await axe.analyze();
    const critical = results.violations.filter((v) => v.impact === "critical");
    if (critical.length) {
      console.error("Critical a11y issues:", critical.map((v) => v.id));
    }
    expect(critical.length).toBe(0);
  });
});