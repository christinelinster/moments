import { expect, test } from "@playwright/test";
import { albumButton, createAlbum, createScrapbook, fixturePng, openShareLink, register } from "./helpers";

test("public viewer opens without auth and playback is read-only", async ({ page, browser }) => {
  await register(page);
  await createScrapbook(page, "Open to the sky");
  const album = await createAlbum(page, "The first page");
  await albumButton(page, album).click();
  await page.locator(".upload-dropzone input[type=file]").setInputFiles(fixturePng("public.png"));
  await expect(page.getByText("public.png", { exact: true })).toBeVisible();
  const shareUrl = await openShareLink(page);

  const publicContext = await browser.newContext();
  const publicPage = await publicContext.newPage();
  await publicPage.goto(shareUrl);
  await expect(publicPage.getByRole("heading", { name: "Open to the sky" })).toBeVisible();
  await expect(publicPage.getByRole("button", { name: "Collaborators" })).toHaveCount(0);
  await publicPage.emulateMedia({ reducedMotion: "reduce" });
  await publicPage.setViewportSize({ width: 390, height: 844 });
  await expect(publicPage.locator(".public-app")).toBeVisible();
  await albumButton(publicPage, "The first page").click();
  await expect(publicPage.getByText("public.png", { exact: true })).toBeVisible();
  await publicPage.getByRole("region", { name: "The first page album" }).getByRole("button", { name: "Play this album" }).click();
  await expect(publicPage.getByRole("region", { name: "Scrapbook playback" })).toBeVisible();
  await expect(publicPage.locator(".playback-player.reduced-motion")).toBeVisible();
  await expect(publicPage.getByRole("button", { name: "Exit playback" })).toBeVisible();
  await publicContext.close();
});
