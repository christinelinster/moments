import { expect, test } from "@playwright/test";
import { createScrapbook, openShareLink, register, uniqueEmail } from "./helpers";

test("owner controls, editor role restrictions, public link, and theme persistence", async ({ page }) => {
  const owner = await register(page, uniqueEmail("owner"));
  await createScrapbook(page, "Shared table");
  const editorEmail = uniqueEmail("editor");
  await page.getByRole("button", { name: /Collaborators/ }).click();
  await page.getByLabel("Add an editor").fill(editorEmail);
  await page.getByRole("button", { name: "Add editor" }).click();
  await expect(page.getByText(editorEmail)).toBeVisible();
  await page.getByRole("button", { name: "Close collaborators" }).click();

  await page.getByRole("button", { name: "Theme" }).click();
  await page.getByRole("radio", { name: /Poolside/ }).click();
  await expect(page.locator(".scrapbook-app")).toHaveClass(/theme-poolside/);
  await page.reload();
  await expect(page.locator(".scrapbook-app")).toHaveClass(/theme-poolside/);

  const publicUrl = await openShareLink(page);
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.getByRole("tab", { name: "Create account" }).click();
  await page.getByLabel("Email").fill(editorEmail);
  await page.getByLabel("Password").fill("correct horse battery staple");
  await page.getByRole("button", { name: "Start a scrapbook" }).click();
  await expect(page.getByRole("heading", { name: "Shared table" })).toBeVisible();
  await expect(page.getByText("editor", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Collaborators/ }).click();
  await expect(page.getByText("You are the editor")).toBeVisible();
  await expect(page.getByRole("button", { name: /Remove / })).toHaveCount(0);
  await expect(publicUrl).toContain("/shared/");
  void owner;
});
