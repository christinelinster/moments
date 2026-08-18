import { expect, test } from "@playwright/test";
import { createScrapbook, fixturePng, register } from "./helpers";
import { startRestartedApi } from "./restarted-api";

test("database rows and uploaded files survive an API restart", async ({ page }) => {
  await register(page);
  await createScrapbook(page, "Restart keeps the desk");
  await page.locator(".upload-dropzone input[type=file]").setInputFiles(fixturePng("persistent.png"));
  await expect(page.getByText("persistent.png", { exact: true })).toBeVisible();

  const scrapbookId = await page.evaluate(async () => {
    const response = await fetch("/api/scrapbooks");
    const payload = await response.json() as { scrapbooks: Array<{ id: string; title: string }> };
    return payload.scrapbooks.find((scrapbook) => scrapbook.title === "Restart keeps the desk")?.id ?? null;
  });
  expect(scrapbookId).toBeTruthy();

  const restartedApi = await startRestartedApi();
  try {
    const persisted = await page.evaluate(async ({ apiOrigin, id }) => {
      const scrapbookResponse = await fetch(`${apiOrigin}/api/scrapbooks/${encodeURIComponent(id)}`, { credentials: "include" });
      const mediaResponse = await fetch(`${apiOrigin}/api/media/${encodeURIComponent(id)}`, { credentials: "include" });
      const mediaPayload = await mediaResponse.json() as { media: Array<{ originalName: string; fileUrl: string }> };
      const fileUrl = mediaPayload.media[0] ? new URL(mediaPayload.media[0].fileUrl, apiOrigin).toString() : null;
      const fileResponse = fileUrl ? await fetch(fileUrl, { credentials: "include" }) : null;
      const scrapbookPayload = await scrapbookResponse.json() as { scrapbook: { title: string } };
      return {
        scrapbookStatus: scrapbookResponse.status,
        title: scrapbookPayload.scrapbook.title,
        mediaStatus: mediaResponse.status,
        fileStatus: fileResponse?.status ?? 0,
        fileName: mediaPayload.media[0]?.originalName,
      };
    }, { apiOrigin: restartedApi.origin, id: scrapbookId! });

    expect(persisted).toEqual({ scrapbookStatus: 200, title: "Restart keeps the desk", mediaStatus: 200, fileStatus: 200, fileName: "persistent.png" });
  } finally {
    await restartedApi.stop();
  }
});
