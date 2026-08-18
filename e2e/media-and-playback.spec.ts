import { expect, test } from "@playwright/test";
import { albumButton, createAlbum, createScrapbook, fixturePng, openShareLink, register } from "./helpers";

test("sticker upload, placement controls, and public media ordering are available", async ({ page, browser }) => {
  await register(page);
  await createScrapbook(page, "Marks and motion");
  const album = await createAlbum(page, "A decorated spread");
  await albumButton(page, album).click();
  await page.locator(".upload-dropzone input[type=file]").setInputFiles(fixturePng("memory.png"));
  await expect(page.getByText("memory.png", { exact: true })).toBeVisible();
  await page.locator(".sticker-tray input[type=file]").setInputFiles(fixturePng("star.png"));
  await expect(page.getByRole("button", { name: "Place star.png" })).toBeVisible();
  await page.getByRole("button", { name: "Place star.png" }).click();
  await expect(page.getByRole("button", { name: "Rotate sticker star.png right" })).toBeVisible();
  await page.getByRole("button", { name: "Rotate sticker star.png right" }).click();
  await page.getByRole("button", { name: "Enlarge sticker star.png" }).click();

  const shareUrl = await openShareLink(page);
  const publicContext = await browser.newContext();
  const publicPage = await publicContext.newPage();
  await publicPage.goto(shareUrl);
  await albumButton(publicPage, "A decorated spread").click();
  await expect(publicPage.locator(".public-sticker-preview img[alt='star.png']")).toBeVisible();
  await publicPage.getByRole("region", { name: "A decorated spread album" }).getByRole("button", { name: "Play this album" }).click();
  await expect(publicPage.locator(".playback-sticker[alt='star.png']")).toBeVisible();
  await expect(publicPage.getByRole("button", { name: "Previous item" })).toBeVisible();
  await publicContext.close();

  await page.getByRole("region", { name: "Sticker tray" }).getByRole("button", { name: "Delete sticker star.png" }).click();
  const deleteDialog = page.getByRole("dialog", { name: "Delete sticker?" });
  await expect(deleteDialog).toBeVisible();
  await deleteDialog.getByRole("button", { name: "Delete sticker" }).click();
  await expect(page.getByRole("button", { name: "Place star.png" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Sticker decorations" }).getByRole("button", { name: "Delete sticker star.png" })).toHaveCount(0);
});
