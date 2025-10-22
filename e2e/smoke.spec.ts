import { test, expect } from "@playwright/test";

test("loads app and shows panels", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Providers")).toBeVisible();
  await expect(page.getByText("Editor (Monaco)")).toBeVisible();
  await expect(page.getByText("Diff (Stub)")).toBeVisible();
  await expect(page.getByText("Chat")).toBeVisible();
  await expect(page.getByText("Preview (Sandbox)")).toBeVisible();
  await expect(page.getByText("Terminal")).toBeVisible();
});
