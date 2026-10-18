import { expect, test, type Page } from "@playwright/test";

const uniqueEmail = () => `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.test`;
const PASSWORD = "e2e-password-123";

async function register(page: Page) {
  await page.goto("/register");
  await page.getByLabel("Name").fill("E2E Writer");
  await page.getByLabel("Email").fill(uniqueEmail());
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole("heading", { name: "Your documents" })).toBeVisible();
}

async function newDocument(page: Page) {
  await page.getByRole("button", { name: "New document" }).first().click();
  await expect(page).toHaveURL(/\/app\/d\/[a-f0-9]{24}$/);
  const editor = page.getByRole("textbox", { name: "Document text" });
  await expect(editor).toBeVisible();
  return editor;
}

test("register, write, get an instant suggestion, accept it, undo/redo, and find it saved after reload", async ({ page }) => {
  await register(page);
  const editor = await newDocument(page);

  await page.getByLabel("Title").fill("Quarterly notes");
  await editor.click();
  await editor.pressSequentially("We recieve the report every week.");

  // Instant check: underlined without any AI call.
  const underline = page.locator(".sg", { hasText: "recieve" });
  await expect(underline).toBeVisible();

  await underline.click();
  const card = page.getByRole("dialog", { name: /Spelling suggestion/ });
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: /^Accept/ }).click();
  await expect(editor).toHaveText("We receive the report every week.");

  // Accepting is one undo step.
  await page.keyboard.press("ControlOrMeta+z");
  await expect(editor).toHaveText("We recieve the report every week.");
  await page.keyboard.press("ControlOrMeta+Shift+z");
  await expect(editor).toHaveText("We receive the report every week.");

  await expect(page.getByRole("status").filter({ hasText: /Saved|All changes saved/ }).first()).toBeVisible({ timeout: 15_000 });
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Document text" })).toHaveText("We receive the report every week.");
  await expect(page.getByLabel("Title")).toHaveValue("Quarterly notes");

  // The dashboard lists it with a snippet.
  await page.getByRole("link", { name: "Back to documents" }).click();
  await expect(page.getByText("Quarterly notes")).toBeVisible();
  await expect(page.getByText("We receive the report every week.")).toBeVisible();
});

test("a stale tab gets a conflict notice instead of overwriting newer text", async ({ page, context }) => {
  await register(page);
  const editorA = await newDocument(page);
  const url = page.url();
  await editorA.click();
  await editorA.pressSequentially("First version.");
  await expect(page.getByRole("status").filter({ hasText: /^Saved$/ }).first()).toBeVisible({ timeout: 15_000 });

  const pageB = await context.newPage();
  await pageB.goto(url);
  const editorB = pageB.getByRole("textbox", { name: "Document text" });
  await expect(editorB).toHaveText("First version.");

  // Tab A saves a newer version...
  await editorA.press("End");
  await editorA.pressSequentially(" Edited in tab A.");
  await expect(page.getByRole("status").filter({ hasText: /^Saved$/ }).first()).toBeVisible({ timeout: 15_000 });

  // ...so tab B, still on the old version, must not overwrite it.
  await editorB.click();
  await editorB.press("End");
  await editorB.pressSequentially(" Edited in tab B.");
  await expect(pageB.getByRole("alert").filter({ hasText: "changed in another tab" })).toBeVisible({ timeout: 15_000 });

  await page.reload();
  await expect(page.getByRole("textbox", { name: "Document text" })).toHaveText("First version. Edited in tab A.");
});

test("trash and restore with optimistic updates", async ({ page }) => {
  await register(page);
  await newDocument(page);
  await page.getByLabel("Title").fill("Disposable");
  await expect(page.getByRole("status").filter({ hasText: /^Saved$/ }).first()).toBeVisible({ timeout: 15_000 });
  await page.getByRole("link", { name: "Back to documents" }).click();

  await page.getByRole("button", { name: "Actions for Disposable" }).click();
  await page.getByRole("menuitem", { name: "Move to trash" }).click();
  await expect(page.getByText("Moved to trash")).toBeVisible();
  await expect(page.getByRole("link", { name: "Open Disposable" })).toHaveCount(0);

  await page.getByRole("tab", { name: "Trash" }).click();
  await expect(page.getByText("Disposable")).toBeVisible();
  await page.getByRole("button", { name: "Restore" }).click();
  await page.getByRole("tab", { name: "Documents" }).click();
  await expect(page.getByRole("link", { name: "Open Disposable" })).toBeVisible();
});

test("signed-out visitors are sent to login, and every API route refuses them", async ({ page, request }) => {
  await page.goto("/app");
  await expect(page).toHaveURL(/\/login\?next=%2Fapp/);
  for (const [method, path] of [
    ["GET", "/api/me"],
    ["GET", "/api/documents"],
    ["POST", "/api/check"],
    ["PUT", "/api/style-guide"],
  ] as const) {
    const res = await request.fetch(path, { method, data: method === "GET" ? undefined : {} });
    expect(res.status(), `${method} ${path}`).toBe(401);
  }
  expect((await request.get("/api/health")).status()).toBe(200);
});
