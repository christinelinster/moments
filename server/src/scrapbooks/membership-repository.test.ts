import { describe, expect, it, vi } from "vitest";

import { addEditor, linkPendingMemberships } from "./membership-repository.js";

function makeTransactionalDb(query: ReturnType<typeof vi.fn>) {
  const release = vi.fn();
  return {
    db: {
      connect: vi.fn().mockResolvedValue({ query, release }),
    },
    release,
  };
}

describe("editor membership repository", () => {
  it("resolves a matching account in the same statement as the invite upsert", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: "membership-1",
            scrapbook_id: "scrapbook-1",
            email: "person@example.com",
            user_id: "user-1",
            linked_at: new Date("2026-08-15T12:00:00.000Z"),
            created_at: new Date("2026-08-15T12:00:00.000Z"),
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });
    const { db, release } = makeTransactionalDb(query);

    const membership = await addEditor(
      db as never,
      "scrapbook-1",
      "person@example.com",
    );

    expect(query).toHaveBeenCalledTimes(4);
    expect(query).toHaveBeenNthCalledWith(1, "BEGIN");
    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("pg_advisory_xact_lock"),
      ["person@example.com"],
    );
    expect(query).toHaveBeenNthCalledWith(
      3,
      expect.stringMatching(
        /INSERT INTO scrapbook_editors[\s\S]*LEFT JOIN users[\s\S]*ON users\.email = \$2/,
      ),
      ["scrapbook-1", "person@example.com"],
    );
    expect(query).toHaveBeenNthCalledWith(4, "COMMIT");
    expect(release).toHaveBeenCalledOnce();
    expect(membership.userId).toBe("user-1");
  });

  it("preserves an existing linked account when a conflict has no matching account", async () => {
    const linkedAt = new Date("2026-08-15T12:00:00.000Z");
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: "membership-1",
            scrapbook_id: "scrapbook-1",
            email: "person@example.com",
            user_id: "user-1",
            linked_at: linkedAt,
            created_at: new Date("2026-08-15T11:00:00.000Z"),
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });
    const { db } = makeTransactionalDb(query);

    const membership = await addEditor(
      db as never,
      "scrapbook-1",
      "person@example.com",
    );

    expect(query).toHaveBeenNthCalledWith(
      3,
      expect.stringMatching(
        /DO UPDATE SET[\s\S]*user_id = COALESCE\(EXCLUDED\.user_id, scrapbook_editors\.user_id\)[\s\S]*linked_at = COALESCE\(EXCLUDED\.linked_at, scrapbook_editors\.linked_at\)/,
      ),
      ["scrapbook-1", "person@example.com"],
    );
    expect(membership.userId).toBe("user-1");
    expect(membership.linkedAt).toEqual(linkedAt);
  });

  it("locks an email before linking pending memberships", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });

    await linkPendingMemberships(
      { query } as never,
      "user-1",
      "person@example.com",
    );

    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("pg_advisory_xact_lock"),
      ["person@example.com"],
    );
    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("UPDATE scrapbook_editors"),
      ["user-1", "person@example.com"],
    );
  });
});
