import { describe, expect, it, vi } from "vitest";

import { addEditor } from "./membership-repository.js";

describe("editor membership repository", () => {
  it("resolves a matching account in the same statement as the invite upsert", async () => {
    const db = {
      query: vi.fn().mockResolvedValue({
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
      }),
    };

    const membership = await addEditor(
      db as never,
      "scrapbook-1",
      "person@example.com",
    );

    expect(db.query).toHaveBeenCalledTimes(1);
    expect(db.query).toHaveBeenCalledWith(
      expect.stringMatching(
        /INSERT INTO scrapbook_editors[\s\S]*LEFT JOIN users[\s\S]*ON users\.email = \$2/,
      ),
      ["scrapbook-1", "person@example.com"],
    );
    expect(membership.userId).toBe("user-1");
  });
});
