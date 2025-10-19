import { test, expect } from "@playwright/test";

test("import → push → deploy flow (mocked APIs)", async ({ page }) => {
  await page.goto("/");

  // Open Integrations section panels are visible
  await expect(page.getByText("Git")).toBeVisible();
  await expect(page.getByText("Deploy")).toBeVisible();

  // Mock GitHub zipball fetch for import
  await page.route("https://api.github.com/repos/*/zipball/*", (route) => {
    const zipContent = new Uint8Array([]); // empty zip acceptable for test
    route.fulfill({ status: 200, body: zipContent, headers: { "content-type": "application/zip" } });
  });

  // Fill repo URL and import
  await page.getByLabel("Git repository URL").fill("https://github.com/owner/repo.git");
  await page.getByRole("button", { name: "Import" }).click();

  // Mock GitHub contents API for push PUT/DELETE
  await page.route("https://api.github.com/repos/*/contents/**", (route) => {
    if (route.request().method() === "PUT" || route.request().method() === "DELETE") {
      route.fulfill({ status: 200, body: JSON.stringify({}) });
      return;
    }
    route.continue();
  });

  // Mock GitHub trees API
  await page.route("https://api.github.com/repos/*/git/trees/*", (route) => {
    route.fulfill({ status: 200, body: JSON.stringify({ tree: [] }) });
  });

  // Push
  await page.getByLabel("Branch").fill("main");
  await page.getByRole("button", { name: "Push changes" }).click();

  // Mock Netlify create deploy and uploads
  await page.route("https://api.netlify.com/api/v1/sites/*/deploys", (route) => {
    const body = {
      id: "dep1",
      required: ["/index.html", "/app.js"],
      deploy_uploads_url: "https://api.netlify.com/deploys/dep1/files",
    };
    route.fulfill({ status: 200, body: JSON.stringify(body), headers: { "content-type": "application/json" } });
  });
  await page.route("https://api.netlify.com/deploys/dep1/files/**", (route) => {
    route.fulfill({ status: 200, body: "" });
  });
  // Mock Netlify status polling
  await page.route("https://api.netlify.com/api/v1/deploys/dep1", (route) => {
    route.fulfill({ status: 200, body: JSON.stringify({ state: "ready" }), headers: { "content-type": "application/json" } });
  });

  // Fill Netlify creds and deploy
  await page.getByLabel("Netlify token").fill("tok");
  await page.getByLabel("Netlify site id").fill("site");
  await page.getByRole("button", { name: "Deploy to Netlify" }).click();

  // Expect some status log text
  await expect(page.getByText("Netlify deploy ready")).toBeVisible();
});