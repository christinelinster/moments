import os from "node:os";
import path from "node:path";

import "dotenv/config";

export const e2eSchema = process.env.E2E_SCHEMA ?? "moments_e2e";

function mediaRoot(): string {
  const root = path.resolve(process.env.E2E_MEDIA_ROOT ?? path.join(os.tmpdir(), "moments-e2e-media"));
  const relativeToTemp = path.relative(os.tmpdir(), root);
  if (!relativeToTemp || relativeToTemp.startsWith("..") || path.isAbsolute(relativeToTemp)) {
    throw new Error("E2E_MEDIA_ROOT must be a dedicated directory below the operating system temporary directory.");
  }
  if (process.env.MEDIA_ROOT && root === path.resolve(process.env.MEDIA_ROOT)) {
    throw new Error("Refusing to use MEDIA_ROOT for Playwright. Set E2E_MEDIA_ROOT to a temporary test directory.");
  }
  return root;
}

export const e2eMediaRoot = mediaRoot();

function baseDatabaseUrl(): string {
  const value = process.env.E2E_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!value) throw new Error("Playwright requires E2E_DATABASE_URL pointing to a dedicated *_test or *_e2e PostgreSQL database.");

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("E2E_DATABASE_URL must be a valid PostgreSQL connection URL.");
  }
  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
  if (!/(?:_test|_e2e)$/i.test(databaseName)) {
    throw new Error(`Refusing to run Playwright against '${databaseName}'. Set E2E_DATABASE_URL to a dedicated *_test or *_e2e database.`);
  }
  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    throw new Error("E2E_DATABASE_URL must use the postgres or postgresql protocol.");
  }
  return value;
}

function assertSafeSchema() {
  if (!/^[a-z_][a-z0-9_]*$/i.test(e2eSchema)) throw new Error("E2E_SCHEMA may contain only letters, numbers, and underscores.");
}

export function e2eBaseDatabaseUrl(): string {
  assertSafeSchema();
  return baseDatabaseUrl();
}

export function e2eDatabaseUrl(): string {
  const parsed = new URL(e2eBaseDatabaseUrl());
  parsed.searchParams.set("options", `-c search_path=${e2eSchema},public`);
  return parsed.toString();
}
