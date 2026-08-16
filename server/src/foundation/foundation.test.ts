import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { createApp } from "../app.js";

describe("application foundation", () => {
  it("reports API and database health", async () => {
    const db = {
      query: vi.fn().mockResolvedValue({ rows: [{ ok: 1 }] }),
    };
    const storage = {
      put: vi.fn(),
      get: vi.fn(),
      delete: vi.fn(),
    };
    const app = createApp({
      db: db as never,
      storage: storage as never,
      config: { clientOrigin: "http://localhost:5173" },
    });

    const response = await request(app)
      .get("/api/health")
      .set("Origin", "http://localhost:5173");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, database: "up" });
    expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    expect(db.query).toHaveBeenCalledWith("SELECT 1 AS ok");
  });

  it("does not grant CORS access to an untrusted origin", async () => {
    const db = { query: vi.fn().mockResolvedValue({ rows: [{ ok: 1 }] }) };
    const app = createApp({
      db: db as never,
      storage: {} as never,
      config: { clientOrigin: "http://localhost:5173" },
    });

    const response = await request(app)
      .get("/api/health")
      .set("Origin", "https://untrusted.example");

    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
