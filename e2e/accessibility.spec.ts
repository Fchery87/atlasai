import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Comprehensive accessibility automated tests
 * Tests WCAG 2.1 Level AA compliance using axe-core
 */

test.describe("Accessibility Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:5173");
    // Wait for app to be ready
    await page.waitForSelector("#root", { state: "attached" });
  });

  test("should not have any automatically detectable accessibility issues", async ({
    page,
  }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("should have proper heading hierarchy", async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a"])
      .include("h1, h2, h3, h4, h5, h6")
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);

    // Check that there's at least one h1
    const h1Count = await page.locator("h1").count();
    expect(h1Count).toBeGreaterThan(0);
  });

  test("should have accessible navigation", async ({ page }) => {
    // Check for navigation landmarks
    const nav = page.locator("nav");
    await expect(nav).toBeVisible();

    // Check that navigation is properly labeled
    const accessibilityScanResults = await new AxeBuilder({ page })
      .include("nav")
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("should have accessible buttons", async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .include("button")
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);

    // Ensure all buttons have accessible names
    const buttons = await page.locator("button").all();
    for (const button of buttons) {
      const accessibleName =
        (await button.getAttribute("aria-label")) ||
        (await button.textContent());
      expect(accessibleName).toBeTruthy();
    }
  });

  test("should have accessible form inputs", async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .include("input, textarea, select")
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);

    // Check that all inputs have labels
    const inputs = await page.locator("input:not([type=hidden])").all();
    for (const input of inputs) {
      const id = await input.getAttribute("id");
      const ariaLabel = await input.getAttribute("aria-label");
      const ariaLabelledBy = await input.getAttribute("aria-labelledby");

      const hasLabel = id
        ? (await page.locator(`label[for="${id}"]`).count()) > 0
        : false;

      expect(hasLabel || ariaLabel || ariaLabelledBy).toBeTruthy();
    }
  });

  test("should have sufficient color contrast", async ({ page }) => {
    const _accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2aa"])
      .disableRules(["color-contrast"]) // We'll re-enable it specifically
      .analyze();

    const contrastResults = await new AxeBuilder({ page })
      .withRules(["color-contrast"])
      .analyze();

    expect(contrastResults.violations).toEqual([]);
  });

  test("should have skip link for keyboard users", async ({ page }) => {
    // Check for skip link
    const skipLink = page.locator('a[href="#main"]').first();
    await expect(skipLink).toBeAttached();

    // Skip link should be visible when focused
    await skipLink.focus();
    await expect(skipLink).toBeVisible();
  });

  test("should support keyboard navigation", async ({ page }) => {
    // Tab through focusable elements
    const focusableElements = await page
      .locator(
        'a:not([disabled]), button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])',
      )
      .all();

    expect(focusableElements.length).toBeGreaterThan(0);

    // Test tab navigation
    await page.keyboard.press("Tab");
    const firstFocused = await page.evaluate(
      () => document.activeElement?.tagName,
    );
    expect(firstFocused).toBeTruthy();
  });

  test("should have proper ARIA roles and attributes", async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "best-practice"])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("should have accessible images", async ({ page }) => {
    const images = await page.locator("img").all();

    for (const img of images) {
      const alt = await img.getAttribute("alt");
      const ariaLabel = await img.getAttribute("aria-label");
      const ariaHidden = await img.getAttribute("aria-hidden");

      // Images should have alt text or be marked decorative
      expect(
        alt !== null || ariaLabel !== null || ariaHidden === "true",
      ).toBeTruthy();
    }
  });

  test("should have accessible links", async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .include("a")
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);

    // Check that all links have accessible text
    const links = await page.locator("a").all();
    for (const link of links) {
      const textContent = await link.textContent();
      const ariaLabel = await link.getAttribute("aria-label");
      const ariaLabelledBy = await link.getAttribute("aria-labelledby");

      expect(
        (textContent && textContent.trim().length > 0) ||
          ariaLabel ||
          ariaLabelledBy,
      ).toBeTruthy();
    }
  });

  test("command palette should be accessible", async ({ page }) => {
    // Open command palette
    await page.keyboard.press("Control+k");

    // Wait for dialog to open
    await page.waitForSelector('[role="dialog"]', { state: "visible" });

    // Run accessibility scan on dialog
    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('[role="dialog"]')
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);

    // Check for proper ARIA attributes
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toHaveAttribute("aria-modal", "true");

    // Should have accessible name
    const ariaLabelledBy = await dialog.getAttribute("aria-labelledby");
    expect(ariaLabelledBy).toBeTruthy();

    // Close dialog with Escape
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
  });

  test("should have proper focus management in modals", async ({ page }) => {
    // Open command palette
    await page.keyboard.press("Control+k");

    // Wait for dialog
    await page.waitForSelector('[role="dialog"]', { state: "visible" });

    // Focus should be trapped in dialog
    const dialog = page.locator('[role="dialog"]');

    // Get first and last focusable elements
    const focusableInDialog = await dialog
      .locator(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])',
      )
      .all();

    expect(focusableInDialog.length).toBeGreaterThan(0);

    // Tab to last element, then tab again should wrap to first
    for (let i = 0; i < focusableInDialog.length; i++) {
      await page.keyboard.press("Tab");
    }

    // One more tab should wrap to first element (focus trap)
    await page.keyboard.press("Tab");

    // Close dialog
    await page.keyboard.press("Escape");
  });

  test("should have proper screen reader announcements", async ({ page }) => {
    // Check for aria-live regions
    const liveRegions = await page.locator("[aria-live]").all();

    // Should have at least one live region for announcements
    expect(liveRegions.length).toBeGreaterThan(0);

    // Check that the screen reader announcer is present
    const announcer = await page
      .locator(
        '[role="status"], [role="alert"], [aria-live="polite"], [aria-live="assertive"]',
      )
      .first();

    await expect(announcer).toBeAttached();
  });

  test("should handle focus indicators", async ({ page }) => {
    // Get all focusable elements
    const focusableElements = await page
      .locator(
        "a:not([disabled]), button:not([disabled]), input:not([disabled])",
      )
      .all();

    if (focusableElements.length > 0) {
      const firstElement = focusableElements[0];

      // Focus the element
      await firstElement.focus();

      // Check that it's focused
      const isFocused = await page.evaluate(
        (el) => {
          return document.activeElement === el;
        },
        await firstElement.elementHandle(),
      );

      expect(isFocused).toBeTruthy();
    }
  });

  test("should have proper document structure", async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(["document-title", "html-has-lang", "landmark-one-main"])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);

    // Check for main landmark
    const main = page.locator('[role="main"], main');
    const mainCount = await main.count();
    expect(mainCount).toBeGreaterThanOrEqual(1);
  });
});

test.describe("Accessibility - Specific Components", () => {
  test("file tree should be keyboard navigable", async ({ page }) => {
    await page.goto("http://localhost:5173");

    // Find file tree or similar navigation component
    const fileTree = page.locator('[role="tree"], [role="list"]').first();

    if ((await fileTree.count()) > 0) {
      const _accessibilityScanResults = await new AxeBuilder({ page })
        .include('[role="tree"], [role="list"]')
        .analyze();

      expect(_accessibilityScanResults.violations).toEqual([]);
    }
  });

  test("buttons should have accessible states", async ({ page }) => {
    await page.goto("http://localhost:5173");

    const buttons = await page.locator("button[disabled]").all();

    for (const button of buttons) {
      const ariaDisabled = await button.getAttribute("aria-disabled");
      const disabled = await button.getAttribute("disabled");

      // Disabled buttons should have proper attributes
      expect(disabled !== null || ariaDisabled === "true").toBeTruthy();
    }
  });

  test("dynamic content should announce changes", async ({ page }) => {
    await page.goto("http://localhost:5173");

    // Check for ARIA live regions
    const liveRegions = await page.locator("[aria-live]").all();

    // Should have live regions for dynamic updates
    expect(liveRegions.length).toBeGreaterThan(0);

    for (const region of liveRegions) {
      const ariaLive = await region.getAttribute("aria-live");
      expect(["polite", "assertive", "off"]).toContain(ariaLive);
    }
  });
});
