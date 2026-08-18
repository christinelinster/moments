import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { errorHandler } from "../errors.js";
import { createScrapbookRouter } from "./routes.js";

function appFor(db: unknown, userId = "owner-1") {
  const app = express();
  app.use(express.json());
  app.use((request, _response, next) => {
    request.auth = { userId, user: { id: userId, email: `${userId}@example.com`, createdAt: new Date() } };
    next();
  });
  app.use("/api/scrapbooks", createScrapbookRouter({ db: db as never }));
  app.use(errorHandler);
  return app;
}

describe("scrapbook theme routes", () => {
  it("returns the resolved role and persists a validated theme", async () => {
    const db = { query: vi.fn()
      .mockResolvedValueOnce({ rows: [{ role: "owner" }] })
      .mockResolvedValueOnce({ rows: [{ id: "scrapbook-1", owner_id: "owner-1", title: "Notes", theme_key: "moonlight-ink", share_enabled: true, created_at: new Date(), updated_at: new Date() }] }) };
    const response = await request(appFor(db)).patch("/api/scrapbooks/scrapbook-1/theme").send({ themeKey: "moonlight-ink" });
    expect(response.status).toBe(200);
    expect(response.body.scrapbook.themeKey).toBe("moonlight-ink");
  });

  it("rejects invalid theme keys before updating", async () => {
    const db = { query: vi.fn().mockResolvedValueOnce({ rows: [{ role: "editor" }] }) };
    const response = await request(appFor(db, "editor-1")).patch("/api/scrapbooks/scrapbook-1/theme").send({ themeKey: "neon" });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe("INVALID_THEME");
    expect(db.query).toHaveBeenCalledTimes(1);
  });
});
