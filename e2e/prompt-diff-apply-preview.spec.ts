import { test, expect } from "@playwright/test";

test("Prompt → Diff → Apply → Preview end-to-end (mocked adapter streams)", async ({
  page,
}) => {
  await page.goto("/");

  // Create project
  await page.getByLabel("Project name").fill("e2e-project");
  await page.getByRole("button", { name: "Create" }).click();

  // Create index.html
  await page.getByRole("button", { name: "New" }).click();
  const newInput = page.getByLabel("New file path");
  await newInput.fill("index.html");
  await newInput.press("Enter");

  // Open index.html and add minimal content
  await page.getByRole("button", { name: "Open index.html" }).click();
  await page.keyboard.type(
    "<!doctype html><html><body><div id='root'>Hello</div></body></html>",
  );
  // Save
  await page.getByRole("button", { name: "Save" }).click();

  // Open Chat, select provider (GPT‑5 placeholder to avoid API calls)
  await page.getByLabel("Provider").selectOption("gpt5");
  await page.getByLabel("Model").selectOption("gpt-5-code-preview");

  // Fill prompt - this will trigger the GPT-5 placeholder to stream the expected response
  await page
    .getByLabel("Prompt")
    .fill("Replace Hello with World and add a style");

  // Send (GPT-5 placeholder will stream the response)
  await page.getByRole("button", { name: "Send" }).click();

  // Wait for streaming to complete - check for the "Done" status
  await expect(page.getByText("Done")).toBeVisible({ timeout: 5000 });

  // Verify the streamed output appears in the assistant output area
  await expect(page.getByLabel("Assistant output")).toContainText(
    "<!doctype html>",
  );

  // Stage to file (target defaults to current file)
  await page.getByRole("button", { name: "Stage to file" }).click();

  // Approve
  await page.getByRole("button", { name: "Approve" }).click();

  // Preview should reflect change
  // Wait a moment for previewHtml rebuild
  await page.waitForTimeout(300);
  const frame = page.frameLocator("iframe[title='Preview']");
  await expect(frame.locator("#root")).toHaveText("World");
});
