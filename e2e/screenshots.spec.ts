import { test, expect } from "@playwright/test";

// Regenerates the README screenshots: E2E_SCREENSHOTS=1 npm run test:e2e -- screenshots
test.skip(!process.env.E2E_SCREENSHOTS, "screenshots are generated on demand");

const OUT = "docs/screenshots";

for (const scheme of ["light", "dark"] as const) {
  test(`screenshots (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Write clearly/ })).toBeVisible({ timeout: 60_000 });
    await page.waitForTimeout(3000); // let the 3D hero and intro animation settle
    await page.screenshot({ path: `${OUT}/landing-${scheme}.png` });

    await page.goto("/register", { waitUntil: "networkidle" });
    await page.getByLabel("Name").fill("Ada Lovelace");
    await page.getByLabel("Email").fill(`shots-${scheme}-${Date.now()}@example.test`);
    await page.getByLabel("Password", { exact: true }).fill("screenshot-password");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/app$/);

    await page.getByRole("button", { name: "New document" }).first().click();
    await expect(page).toHaveURL(/\/app\/d\//);
    await page.locator("#doc-title").fill("Launch announcement");
    const editor = page.getByRole("textbox", { name: "Document text" });
    await editor.click();
    await editor.pressSequentially(
      "We are exited to announce that our new dashboard is live. Teams can now recieve alerts in real time, and the the setup takes less then five minutes.",
      { delay: 2 },
    );
    await page.keyboard.press("Enter");
    await editor.pressSequentially("In order to get started, open Settings and connect your Postgres database.", { delay: 2 });
    await expect(page.locator(".sg").first()).toBeVisible();
    await page.locator(".sg", { hasText: "recieve" }).click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}/editor-${scheme}.png` });

    await page.getByRole("link", { name: "Back to documents" }).click();
    await expect(page).toHaveURL(/\/app$/);
    await page.getByRole("button", { name: "New document" }).first().click();
    await expect(page).toHaveURL(/\/app\/d\//);
    await page.locator("#doc-title").fill("Q3 planning notes");
    await page.getByRole("textbox", { name: "Document text" }).click();
    await page.keyboard.type("Draft agenda for the quarterly planning session.");
    await page.waitForTimeout(1500);
    await page.getByRole("link", { name: "Back to documents" }).click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}/dashboard-${scheme}.png` });
  });
}

test("screenshots (mobile)", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Write clearly/ })).toBeVisible({ timeout: 60_000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/landing-mobile.png` });
  await page.goto("/register", { waitUntil: "networkidle" });
  await page.getByLabel("Name").fill("Ada Lovelace");
  await page.getByLabel("Email").fill(`shots-m-${Date.now()}@example.test`);
  await page.getByLabel("Password", { exact: true }).fill("screenshot-password");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/app$/);
  await page.getByRole("button", { name: "New document" }).first().click();
  await expect(page).toHaveURL(/\/app\/d\//);
  await page.locator("#doc-title").fill("On the go");
  const editor = page.getByRole("textbox", { name: "Document text" });
  await editor.click();
  await editor.pressSequentially("Quick note: teh meeting moved to thursday in order to fit everyone.", { delay: 2 });
  await expect(page.locator(".sg").first()).toBeVisible();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/editor-mobile.png` });
});
