import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

import { Pool, type PoolClient } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { runMigrations } from "../db/migrate.js";
import {
  addEditor,
  linkPendingMemberships,
} from "./membership-repository.js";

const databaseUrl = process.env.DATABASE_URL;
const describeDatabase = databaseUrl ? describe : describe.skip;

async function waitForAdvisoryLockWait(
  pool: Pool,
  timeoutMilliseconds = 5_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMilliseconds;

  while (Date.now() < deadline) {
    const result = await pool.query<{ waiting: boolean }>(`
      SELECT EXISTS (
        SELECT 1
        FROM pg_stat_activity
        WHERE pid <> pg_backend_pid()
          AND wait_event_type = 'Lock'
          AND query ILIKE '%pg_advisory_xact_lock%'
      ) AS waiting
    `);

    if (result.rows[0]?.waiting) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  throw new Error("Timed out waiting for invite transaction to acquire the email lock");
}

describeDatabase("editor membership concurrency", () => {
  const pool = new Pool({ connectionString: databaseUrl });
  const migrationsDirectory = fileURLToPath(
    new URL("../db/migrations/", import.meta.url),
  );

  beforeAll(async () => {
    await runMigrations(pool, migrationsDirectory);
  });

  afterAll(async () => {
    await pool.end();
  });

  it("links an invite created while registration is committing", async () => {
    const ownerEmail = `owner-${randomUUID()}@example.com`;
    const inviteEmail = `invitee-${randomUUID()}@example.com`;
    let ownerId: string | undefined;
    let scrapbookId: string | undefined;
    let registrationUserId: string | undefined;
    let invitePromise: ReturnType<typeof addEditor> | undefined;
    let registrationClient: PoolClient | undefined;
    let registrationCommitted = false;

    try {
      const ownerResult = await pool.query<{ id: string }>(
        `
          INSERT INTO users (email, password_hash)
          VALUES ($1, 'hash')
          RETURNING id
        `,
        [ownerEmail],
      );
      ownerId = ownerResult.rows[0]?.id;
      if (!ownerId) {
        throw new Error("Concurrency test did not create an owner");
      }

      const scrapbookResult = await pool.query<{ id: string }>(
        `
          INSERT INTO scrapbooks (owner_id, title, public_share_token)
          VALUES ($1, 'Concurrency test', $2)
          RETURNING id
        `,
        [ownerId, `share-${randomUUID()}`],
      );
      scrapbookId = scrapbookResult.rows[0]?.id;
      if (!scrapbookId) {
        throw new Error("Concurrency test did not create a scrapbook");
      }

      const client = await pool.connect();
      registrationClient = client;
      await client.query("BEGIN");
      const userResult = await client.query<{ id: string }>(
        `
          INSERT INTO users (email, password_hash)
          VALUES ($1, 'hash')
          RETURNING id
        `,
        [inviteEmail],
      );
      registrationUserId = userResult.rows[0]?.id;
      if (!registrationUserId) {
        throw new Error("Concurrency test did not create the registering user");
      }

      // The registration transaction has performed its one-time link pass
      // before any invitation row exists and still holds the email lock.
      await linkPendingMemberships(client, registrationUserId, inviteEmail);

      invitePromise = addEditor(pool, scrapbookId, inviteEmail);
      await waitForAdvisoryLockWait(pool);

      await client.query("COMMIT");
      registrationCommitted = true;

      const membership = await invitePromise;
      expect(membership.userId).toBe(registrationUserId);

      const storedMembership = await pool.query<{ user_id: string | null }>(
        `
          SELECT user_id
          FROM scrapbook_editors
          WHERE scrapbook_id = $1 AND email = $2
        `,
        [scrapbookId, inviteEmail],
      );
      expect(storedMembership.rows[0]?.user_id).toBe(registrationUserId);
    } finally {
      if (registrationClient) {
        if (!registrationCommitted) {
          await registrationClient.query("ROLLBACK").catch(() => undefined);
        }
        registrationClient.release();
      }

      await invitePromise?.catch(() => undefined);

      const cleanupIds = [ownerId, registrationUserId].filter(
        (id): id is string => Boolean(id),
      );
      if (cleanupIds.length > 0) {
        await pool.query(
          "DELETE FROM users WHERE id = ANY($1::uuid[])",
          [cleanupIds],
        );
      }
    }
  });
});
