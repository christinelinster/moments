import { expect, type Page } from "@playwright/test";

const onePixelPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
const minimalJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const minimalMov = Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x71, 0x74, 0x20]);

export function fixturePng(name: string) {
  return { name, mimeType: "image/png", buffer: Buffer.concat([onePixelPng, Buffer.from(name)]) };
}

export function fixtureJpeg(name: string) {
  return { name, mimeType: "image/jpeg", buffer: minimalJpeg };
}

export function fixtureMov(name: string) {
  return { name, mimeType: "video/quicktime", buffer: minimalMov };
}

export function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
}

function exactPrefix(value: string) {
  return new RegExp(`^${value.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}(?:$|\\s)`);
}

export function albumButton(page: Page, name: string) {
  return page.getByRole("button", { name: exactPrefix(name) });
}

export async function register(page: Page, email = uniqueEmail("owner"), password = "correct horse battery staple") {
  await page.goto("/");
  await page.getByRole("tab", { name: "Create account" }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Start a scrapbook" }).click();
  await expect(page.getByRole("heading", { name: "Choose a scrapbook" })).toBeVisible();
  return { email, password };
}

export async function createScrapbook(page: Page, title = `Weekend notes ${Date.now()}`) {
  await page.getByLabel("New scrapbook").fill(title);
  await page.getByRole("button", { name: "Create scrapbook" }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  return title;
}

export async function createAlbum(page: Page, name = `First spread ${Date.now()}`) {
  await page.getByRole("button", { name: "Create album" }).click();
  await expect(page.getByRole("dialog", { name: "New album" })).toBeVisible();
  await page.getByRole("dialog").getByLabel("Album name").fill(name);
  await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();
  await expect(albumButton(page, name)).toBeVisible();
  return name;
}

export async function openShareLink(page: Page) {
  await page.getByRole("button", { name: "Public link" }).click();
  await expect(page.getByRole("heading", { name: "Public link" })).toBeVisible();
  const url = await page.getByLabel("Share URL").inputValue();
  expect(url).toMatch(/\/shared\//);
  await page.getByRole("button", { name: "Close public link" }).click();
  return url;
}
