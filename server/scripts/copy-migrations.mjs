import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDirectory = path.join(serverRoot, "src", "db", "migrations");
const targetDirectory = path.join(serverRoot, "dist", "db", "migrations");

await fs.mkdir(targetDirectory, { recursive: true });

for (const filename of await fs.readdir(sourceDirectory)) {
  if (filename.endsWith(".sql")) {
    await fs.copyFile(
      path.join(sourceDirectory, filename),
      path.join(targetDirectory, filename),
    );
  }
}
