import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";

import type { MediaStorage, StoragePutInput, StoredObject } from "./storage";

export function createLocalStorage(rootDirectory: string): MediaStorage {
  const root = path.resolve(rootDirectory);

  function resolveStoragePath(key: string): string {
    if (!key || path.isAbsolute(key)) {
      throw new Error("Storage key must be a relative path");
    }

    const resolved = path.resolve(root, key);
    if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
      throw new Error("Storage key escapes the media root");
    }

    return resolved;
  }

  return {
    async put(input: StoragePutInput): Promise<StoredObject> {
      const destination = resolveStoragePath(input.key);
      await fs.mkdir(path.dirname(destination), { recursive: true });
      let fileHandle: Awaited<ReturnType<typeof fs.open>> | undefined;

      try {
        fileHandle = await fs.open(destination, "wx");
        await pipeline(input.source, fileHandle.createWriteStream());
        fileHandle = undefined;
      } catch (error) {
        if (fileHandle) {
          const createdFile = fileHandle;
          fileHandle = undefined;
          await createdFile.close().catch(() => undefined);
          await fs.rm(destination, { force: true }).catch(() => undefined);
        }
        throw error;
      }

      const stats = await fs.stat(destination);
      return { key: input.key, byteSize: input.byteSize ?? stats.size };
    },

    async get(key: string) {
      const filePath = resolveStoragePath(key);
      await fs.access(filePath);
      return createReadStream(filePath);
    },

    async delete(key: string) {
      await fs.rm(resolveStoragePath(key), { force: true });
    },
  };
}
