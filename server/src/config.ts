import path from "node:path";

import { z } from "zod";

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  CLIENT_ORIGIN: z.string().url().default("http://localhost:5173"),
  MEDIA_ROOT: z.string().min(1).default("./var/media"),
  MAX_MEDIA_BYTES: z.coerce.number().int().positive().default(250 * 1024 * 1024),
  MAX_STICKER_BYTES: z.coerce.number().int().positive().default(10 * 1024 * 1024),
  SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(30 * 24 * 60 * 60),
});

export type AppConfig = {
  nodeEnv: "development" | "test" | "production";
  port: number;
  databaseUrl: string;
  clientOrigin: string;
  mediaRoot: string;
  maxMediaBytes: number;
  maxStickerBytes: number;
  sessionTtlSeconds: number;
};

export function loadConfig(env: NodeJS.ProcessEnv): AppConfig {
  const parsed = environmentSchema.parse(env);

  return {
    nodeEnv: parsed.NODE_ENV,
    port: parsed.PORT,
    databaseUrl: parsed.DATABASE_URL,
    clientOrigin: parsed.CLIENT_ORIGIN,
    mediaRoot: path.resolve(parsed.MEDIA_ROOT),
    maxMediaBytes: parsed.MAX_MEDIA_BYTES,
    maxStickerBytes: parsed.MAX_STICKER_BYTES,
    sessionTtlSeconds: parsed.SESSION_TTL_SECONDS,
  };
}
