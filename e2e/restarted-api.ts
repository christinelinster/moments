import { spawn } from "node:child_process";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { e2eDatabaseUrl, e2eMediaRoot } from "./test-environment";

const repositoryRoot = path.resolve(process.cwd());
const tsxEntrypoint = path.join(repositoryRoot, "node_modules", "tsx", "dist", "cli.mjs");

export type RestartedApi = {
  origin: string;
  port: number;
  stop: () => Promise<void>;
};

async function waitForHealth(child: ReturnType<typeof spawn>, origin: string) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`Restarted API exited before becoming healthy (code ${child.exitCode}).`);
    try {
      const response = await fetch(`${origin}/api/health`);
      if (response.ok) return;
      lastError = new Error(`Health check returned ${response.status}.`);
    } catch (error) {
      lastError = error;
    }
    await delay(100);
  }
  throw new Error(`Restarted API did not become healthy: ${lastError instanceof Error ? lastError.message : "unknown error"}`);
}

export async function startRestartedApi(port = 3001): Promise<RestartedApi> {
  const origin = `http://localhost:${port}`;
  const child = spawn(process.execPath, [tsxEntrypoint, "src/server.ts"], {
    cwd: path.join(repositoryRoot, "server"),
    env: {
      ...process.env,
      NODE_ENV: "test",
      PORT: String(port),
      DATABASE_URL: e2eDatabaseUrl(),
      MEDIA_ROOT: e2eMediaRoot,
      CLIENT_ORIGIN: "http://localhost:5173",
    },
    stdio: "ignore",
  });

  let stopped = false;
  async function stop() {
    if (stopped) return;
    stopped = true;
    if (child.exitCode !== null) return;
    await new Promise<void>((resolve) => {
      const timeout = globalThis.setTimeout(() => {
        child.kill("SIGKILL");
        resolve();
      }, 5_000);
      child.once("exit", () => {
        globalThis.clearTimeout(timeout);
        resolve();
      });
      child.kill("SIGTERM");
    });
  }

  try {
    await waitForHealth(child, origin);
    return { origin, port, stop };
  } catch (error) {
    await stop();
    throw error;
  }
}
