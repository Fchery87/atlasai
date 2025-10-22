import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function runAxe(page, contextName: string) {
  const axe = new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .disableRules([
      // Customize rules if needed; example: color-contrast checks may be flaky under headless rendering
      // "color-contrast"
    ]);
  const results = await axe.analyze();
  const seriousOrWorse = results.violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious",
  );
  if (seriousOrWorse.length) {
    console.error(
      `[a11y ${contextName}] serious/critical:`,
      seriousOrWorse.map((v) => v.id),
    );
  }
  // Threshold: allow 0 serious/critical
  expect(seriousOrWorse.length, `[a11y ${contextName}]`).toBe(0);
}

test.describe("Accessibility", () => {
  test("main screen and interactions meet a11y thresholds", async ({
    page,
  }) => {
    await page.goto("/");

    // Core panels
    await expect(
      page.getByRole("heading", { name: "Providers" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Files" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Editor (Monaco)" }),
    ).toBeVisible();
    await runAxe(page, "home");

    // Open command palette
    await page.keyboard.press(
      process.platform === "darwin" ? "Meta+K" : "Control+K",
    );
    await expect(page.getByRole("dialog")).toBeVisible();
    await runAxe(page, "command-palette");
    await page.keyboard.press("Escape");

    // Snapshots panel interaction
    await expect(
      page.getByRole("heading", { name: "Snapshots" }),
    ).toBeVisible();
    await runAxe(page, "snapshots");

    // Git/Deploy section
    await expect(page.getByRole("heading", { name: "Git" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Deploy" })).toBeVisible();
    await runAxe(page, "integrations");
  });
});
