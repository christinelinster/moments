import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../app.js";
import { createAuthContext, requireSession } from "./middleware.js";

type FakeUser = {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
};

type FakeSession = {
  tokenHash: string;
  userId: string;
  expiresAt: Date;
  revokedAt?: Date;
};

class FakeDatabase {
  readonly users = new Map<string, FakeUser>();
  readonly sessions = new Map<string, FakeSession>();
  private nextId = 1;

  async query(text: string, values: unknown[] = []) {
    if (text.includes("INSERT INTO users")) {
      const email = String(values[0]);
      if ([...this.users.values()].some((user) => user.email === email)) {
        const error = Object.assign(new Error("duplicate email"), {
          code: "23505",
          constraint: "users_email_key",
        });
        throw error;
      }

      const user: FakeUser = {
        id: `user-${this.nextId++}`,
        email,
        passwordHash: String(values[1]),
        createdAt: new Date("2026-08-15T12:00:00.000Z"),
      };
      this.users.set(user.id, user);
      return {
        rows: [
          {
            id: user.id,
            email: user.email,
            created_at: user.createdAt,
          },
        ],
      };
    }

    if (text.includes("SELECT id, email, password_hash")) {
      const user = [...this.users.values()].find((candidate) => candidate.email === values[0]);
      return {
        rows: user
          ? [
              {
                id: user.id,
                email: user.email,
                password_hash: user.passwordHash,
                created_at: user.createdAt,
              },
            ]
          : [],
      };
    }

    if (text.includes("INSERT INTO sessions")) {
      const [tokenHash, userId, expiresAt] = values;
      this.sessions.set(String(tokenHash), {
        tokenHash: String(tokenHash),
        userId: String(userId),
        expiresAt: new Date(String(expiresAt)),
      });
      return { rows: [] };
    }

    if (text.includes("UPDATE sessions")) {
      const session = this.sessions.get(String(values[0]));
      if (session) {
        session.revokedAt = new Date();
      }
      return { rows: [] };
    }

    if (text.includes("FROM sessions")) {
      const session = this.sessions.get(String(values[0]));
      if (!session || session.revokedAt || session.expiresAt <= new Date()) {
        return { rows: [] };
      }

      const user = this.users.get(session.userId);
      return {
        rows: user
          ? [
              {
                id: user.id,
                email: user.email,
                created_at: user.createdAt,
              },
            ]
          : [],
      };
    }

    throw new Error(`Unhandled SQL in test database: ${text}`);
  }

  expireAllSessions() {
    for (const session of this.sessions.values()) {
      session.expiresAt = new Date(0);
    }
  }
}

function createTestApp(database: FakeDatabase) {
  return createApp({
    db: database as never,
    storage: {} as never,
    config: {
      clientOrigin: "http://localhost:5173",
      nodeEnv: "test",
      sessionTtlSeconds: 3600,
    },
  });
}

describe("authentication routes", () => {
  it("registers a normalized email and sets an HTTP-only session cookie", async () => {
    const database = new FakeDatabase();
    const response = await request(createTestApp(database))
      .post("/api/auth/register")
      .send({ email: "  Person@Example.COM ", password: "correct horse battery staple" });

    expect(response.status).toBe(201);
    expect(response.body.user).toMatchObject({
      id: "user-1",
      email: "person@example.com",
    });
    expect(response.body.user).not.toHaveProperty("passwordHash");
    expect(response.headers["set-cookie"]).toHaveLength(1);
    expect(response.headers["set-cookie"][0]).toMatch(/HttpOnly/);
    expect(response.headers["set-cookie"][0]).toMatch(/SameSite=Lax/);
    expect(response.headers["set-cookie"][0]).not.toMatch(/Secure/);
  });

  it("rejects duplicate normalized email addresses safely", async () => {
    const database = new FakeDatabase();
    const app = createTestApp(database);
    const body = { email: "person@example.com", password: "correct horse battery staple" };

    await request(app).post("/api/auth/register").send(body).expect(201);
    const response = await request(app)
      .post("/api/auth/register")
      .send({ ...body, email: "PERSON@EXAMPLE.COM" });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: "EMAIL_IN_USE",
      message: "An account with that email already exists",
    });
  });

  it("rejects invalid registration input without creating an account", async () => {
    const database = new FakeDatabase();
    const response = await request(createTestApp(database))
      .post("/api/auth/register")
      .send({ email: "not-an-email", password: "short" });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("INVALID_EMAIL");
    expect(database.users.size).toBe(0);
  });

  it("uses the same safe invalid-credentials response for unknown and wrong passwords", async () => {
    const database = new FakeDatabase();
    const app = createTestApp(database);
    const credentials = { email: "person@example.com", password: "correct horse battery staple" };

    await request(app).post("/api/auth/register").send(credentials).expect(201);

    const wrongPassword = await request(app)
      .post("/api/auth/login")
      .send({ ...credentials, password: "wrong password" });
    const unknownEmail = await request(app)
      .post("/api/auth/login")
      .send({ email: "unknown@example.com", password: credentials.password });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body).toEqual(unknownEmail.body);
    expect(wrongPassword.body.error).toBe("INVALID_CREDENTIALS");
  });

  it("restores the current session with a safe user profile", async () => {
    const database = new FakeDatabase();
    const app = createTestApp(database);
    const agent = request.agent(app);

    await agent
      .post("/api/auth/register")
      .send({ email: "person@example.com", password: "correct horse battery staple" })
      .expect(201);

    const response = await agent.get("/api/auth/me");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      user: {
        id: "user-1",
        email: "person@example.com",
        createdAt: "2026-08-15T12:00:00.000Z",
      },
    });
    expect(response.body.user).not.toHaveProperty("passwordHash");
  });

  it("invalidates the session on logout", async () => {
    const database = new FakeDatabase();
    const agent = request.agent(createTestApp(database));

    await agent
      .post("/api/auth/register")
      .send({ email: "person@example.com", password: "correct horse battery staple" })
      .expect(201);
    await agent.post("/api/auth/logout").expect(204);

    await agent.get("/api/auth/me").expect(401);
  });

  it("rejects expired sessions and requests without a session", async () => {
    const database = new FakeDatabase();
    const app = createTestApp(database);
    const agent = request.agent(app);

    await agent
      .post("/api/auth/register")
      .send({ email: "person@example.com", password: "correct horse battery staple" })
      .expect(201);
    database.expireAllSessions();

    await agent.get("/api/auth/me").expect(401);
    await request(app).get("/api/auth/me").expect(401);
  });

  it("protects a route with reusable session middleware", async () => {
    const database = new FakeDatabase();
    const authApp = createTestApp(database);
    const agent = request.agent(authApp);
    const registration = await agent
      .post("/api/auth/register")
      .send({ email: "person@example.com", password: "correct horse battery staple" })
      .expect(201);
    const sessionCookie = registration.headers["set-cookie"];

    const protectedApp = express();
    protectedApp.use(createAuthContext(database as never));
    protectedApp.get(
      "/protected",
      requireSession(database as never),
      (request, response) => response.json({ userId: request.auth?.userId }),
    );

    await request(protectedApp).get("/protected").expect(401);
    await request(protectedApp)
      .get("/protected")
      .set("Cookie", sessionCookie)
      .expect(200, { userId: "user-1" });
  });
});
