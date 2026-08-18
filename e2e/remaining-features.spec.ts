import { expect, test } from "@playwright/test";
import { createScrapbook, fixtureJpeg, fixtureMov, fixturePng, register } from "./helpers";

test("accepts JPEG and MOV uploads, reports duplicates, and previews full-screen playback", async ({ page }) => {
  await register(page);
  await createScrapbook(page, "Remaining features");

  const upload = page.locator(".upload-dropzone input[type=file]");
  await upload.setInputFiles([fixturePng("fit.png"), fixtureJpeg("memory.jpeg"), fixtureMov("memory.mov")]);
  await expect(page.getByText("fit.png", { exact: true })).toBeVisible();
  await expect(page.getByText("memory.jpeg", { exact: true })).toBeVisible();
  await expect(page.getByText("memory.mov", { exact: true })).toBeVisible();

  await upload.setInputFiles(fixtureJpeg("memory.jpeg"));
  await expect(page.getByText("memory.jpeg is already in this scrapbook.", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Preview" }).click();
  await expect(page.getByText("Editor preview", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Close preview" })).toBeVisible();
  await page.getByRole("button", { name: "Start the story" }).click();

  const playback = page.locator(".playback-player");
  await expect(playback).toBeVisible();
  await page.waitForTimeout(500);
  const mediaFit = await page.locator(".playback-media").evaluate((media) => {
    const child = media.firstElementChild;
    if (!child) return { fits: false, tag: null };
    const mediaBounds = media.getBoundingClientRect();
    const childBounds = child.getBoundingClientRect();
    return {
      fits: childBounds.width <= mediaBounds.width + 1 && childBounds.height <= mediaBounds.height + 1,
      tag: child.tagName,
      width: childBounds.width,
      height: childBounds.height,
      mediaWidth: mediaBounds.width,
      mediaHeight: mediaBounds.height,
    };
  });
  expect(mediaFit.fits).toBe(true);
  await page.getByRole("button", { name: "Next item" }).click();
  await page.getByRole("button", { name: "Next item" }).click();
  const video = page.locator(".playback-media video");
  await expect(video).toBeVisible();
  const videoFit = await video.evaluate((element) => {
    const media = element.parentElement!;
    const mediaBounds = media.getBoundingClientRect();
    const videoBounds = element.getBoundingClientRect();
    return videoBounds.width <= mediaBounds.width + 1 && videoBounds.height <= mediaBounds.height + 1;
  });
  expect(videoFit).toBe(true);
  const bounds = await playback.boundingBox();
  const viewport = page.viewportSize();
  expect(bounds?.width).toBeGreaterThanOrEqual((viewport?.width ?? 0) - 1);
  expect(bounds?.height).toBeGreaterThanOrEqual((viewport?.height ?? 0) - 1);
});
