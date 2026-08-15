import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { createApp } from "../app";

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
    const app = createApp({ db: db as never, storage: storage as never });

    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, database: "up" });
    expect(db.query).toHaveBeenCalledWith("SELECT 1 AS ok");
  });
});
