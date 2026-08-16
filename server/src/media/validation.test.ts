import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { validateUploadedFile, type UploadedFile } from "./validation.js";

describe("media upload validation", () => {
  const temporaryFiles: string[] = [];

  afterEach(async () => {
    await Promise.all(
      temporaryFiles.splice(0).map((filePath) => fs.rm(filePath, { force: true })),
    );
  });

  async function createUpload(
    name: string,
    contents: Uint8Array,
    mimeType: string,
  ): Promise<UploadedFile> {
    const filePath = path.join(os.tmpdir(), `photo-scrapbook-${name}`);
    await fs.writeFile(filePath, contents);
    temporaryFiles.push(filePath);
    return {
      filepath: filePath,
      originalFilename: name,
      mimetype: mimeType,
      size: contents.byteLength,
    };
  }

  it("accepts supported photo and video signatures", async () => {
    const photo = await createUpload(
      "memory.jpg",
      Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]),
      "image/jpeg",
    );
    const video = await createUpload(
      "memory.mp4",
      Uint8Array.from([
        0x00,
        0x00,
        0x00,
        0x18,
        0x66,
        0x74,
        0x79,
        0x70,
        0x6d,
        0x70,
        0x34,
      ]),
      "video/mp4",
    );

    await expect(validateUploadedFile(photo, "media")).resolves.toMatchObject({
      originalName: "memory.jpg",
      mimeType: "image/jpeg",
      mediaType: "photo",
      byteSize: 6,
    });
    await expect(validateUploadedFile(video, "media")).resolves.toMatchObject({
      originalName: "memory.mp4",
      mimeType: "video/mp4",
      mediaType: "video",
      byteSize: 11,
    });
  });

  it("rejects unsupported MIME types", async () => {
    const upload = await createUpload(
      "notes.pdf",
      Uint8Array.from([0x25, 0x50, 0x44, 0x46]),
      "application/pdf",
    );

    await expect(validateUploadedFile(upload, "media")).rejects.toMatchObject({
      statusCode: 415,
      code: "UNSUPPORTED_MEDIA_TYPE",
    });
  });

  it("rejects a file whose signature does not match its MIME type", async () => {
    const upload = await createUpload(
      "fake.jpg",
      Uint8Array.from([0x25, 0x50, 0x44, 0x46]),
      "image/jpeg",
    );

    await expect(validateUploadedFile(upload, "media")).rejects.toMatchObject({
      statusCode: 415,
      code: "INVALID_FILE_SIGNATURE",
    });
  });

  it("rejects uploads over the configured media limit", async () => {
    const upload = await createUpload(
      "large.mp4",
      Uint8Array.from([
        0x00,
        0x00,
        0x00,
        0x18,
        0x66,
        0x74,
        0x79,
        0x70,
        0x6d,
        0x70,
        0x34,
      ]),
      "video/mp4",
    );

    await expect(
      validateUploadedFile(upload, "media", { maxBytes: 10 }),
    ).rejects.toMatchObject({
      statusCode: 413,
      code: "UPLOAD_TOO_LARGE",
    });
  });
});
