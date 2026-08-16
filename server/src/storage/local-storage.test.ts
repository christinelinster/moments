import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";

import { afterEach, describe, expect, it } from "vitest";

import { createLocalStorage } from "./local-storage";

describe("local media storage", () => {
  const roots: string[] = [];

  afterEach(async () => {
    await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
  });

  it("preserves an existing file after a duplicate-key write fails", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "photo-scrapbook-storage-"));
    roots.push(root);
    const storage = createLocalStorage(root);

    await storage.put({ key: "photo.jpg", source: Readable.from(["original"]) });

    await expect(
      storage.put({ key: "photo.jpg", source: Readable.from(["replacement"]) }),
    ).rejects.toMatchObject({ code: "EEXIST" });

    await expect(fs.readFile(path.join(root, "photo.jpg"), "utf8")).resolves.toBe("original");
  });

  it("rejects keys that escape the media root", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "photo-scrapbook-storage-"));
    roots.push(root);
    const storage = createLocalStorage(root);

    await expect(
      storage.put({ key: "../outside.txt", source: Readable.from(["blocked"]) }),
    ).rejects.toThrow("Storage key escapes the media root");
  });

  it("cleans up a file created by a failed stream", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "photo-scrapbook-storage-"));
    roots.push(root);
    const storage = createLocalStorage(root);
    const source = new Readable({
      read() {
        this.push("partial");
        this.destroy(new Error("source failed"));
      },
    });

    await expect(
      storage.put({ key: "failed.jpg", source }),
    ).rejects.toThrow("source failed");

    await expect(fs.access(path.join(root, "failed.jpg"))).rejects.toMatchObject({
      code: "ENOENT",
    });
  });
});
