import { expect, test } from "@playwright/test";
import { createScrapbook, register } from "./helpers";

test("registration, scrapbook creation, and sign-out return to auth", async ({ page }) => {
  await register(page);
  await createScrapbook(page, "A small beginning");
  await expect(page.getByRole("region", { name: "Paper spread" })).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("tab", { name: "Sign in" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open scrapbook" })).toBeVisible();
});
