import { test, expect } from "@playwright/test";

test("Prompt → Diff → Apply → Preview end-to-end (mocked adapter streams)", async ({ page }) => {
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
  await page.keyboard.type("<!doctype html><html><body><div id='root'>Hello</div></body></html>");
  // Save
  await page.getByRole("button", { name: "Save" }).click();

  // Open Chat, select provider (GPT‑5 placeholder to avoid API calls)
  await page.getByLabel("Provider").selectOption("gpt5");
  await page.getByLabel("Model").selectOption("gpt-5-code-preview");

  // Fill prompt and mock streaming response
  await page.getByLabel("Prompt").fill("Replace Hello with World and add a style");
  await page.route("**/v1/chat/completions", (route) => {
    // not used for GPT-5 placeholder, but route anyway
    route.fulfill({ status: 200, body: JSON.stringify({}) });
  });

  // Send (GPT-5 placeholder will stream static chunks we display)
  await page.getByRole("button", { name: "Send" }).click();

  // Simulate output by injecting text into the editable area (since GPT-5 is placeholder)
  await page.getByLabel("Assistant output").fill("<!doctype html><html><head><style>body{color:blue}</style></head><body><div id='root'>World</div></body></html>");

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