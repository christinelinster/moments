import { expect, test } from "@playwright/test";
import { albumButton, createAlbum, createScrapbook, fixturePng, register } from "./helpers";

test("editor uploads, captions, reorders, bulk-moves, and reloads persisted state", async ({ page }) => {
  await register(page);
  await createScrapbook(page, "Editor acceptance");
  const album = await createAlbum(page, "City walks");
  await albumButton(page, album).click();
  await page.locator(".upload-dropzone input[type=file]").setInputFiles([fixturePng("first.png"), fixturePng("second.png")]);
  await expect(page.getByText("first.png", { exact: true })).toBeVisible();
  await expect(page.getByText("second.png", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Edit details for first.png" }).click();
  await page.getByLabel("Caption").fill("A bright afternoon");
  await page.getByLabel("Location").fill("Toronto");
  await page.getByRole("button", { name: "Save details" }).click();
  await expect(page.getByText("Details saved", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Move second.png earlier" }).click();
  await page.getByRole("checkbox", { name: "Select first.png" }).check();
  await page.getByRole("checkbox", { name: "Select second.png" }).check();
  await expect(page.getByRole("toolbar", { name: "Bulk memory actions" })).toContainText("2 selected");
  await page.getByRole("combobox").selectOption("__all__");
  await expect(page.getByText("Selected memories moved", { exact: true })).not.toBeVisible();
  await page.getByRole("button", { name: "Move selected" }).click();
  await expect(page.getByText("Selected memories moved", { exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Editor acceptance" })).toBeVisible();
  await page.getByRole("button", { name: /^All memories/ }).click();
  await page.getByRole("button", { name: "Edit details for first.png" }).click();
  await expect(page.getByLabel("Caption")).toHaveValue("A bright afternoon");
  await expect(page.getByLabel("Location")).toHaveValue("Toronto");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".mobile-action-bar")).toBeVisible();
});
