import type { SessionDatabase } from "../auth/sessions.js";

export type EditorMembership = {
  id: string;
  scrapbookId: string;
  email: string;
  userId: string | null;
  linkedAt: Date | null;
  createdAt: Date;
};

type MembershipRow = {
  id: string;
  scrapbook_id: string;
  email: string;
  user_id: string | null;
  linked_at: Date | string | null;
  created_at: Date | string;
};

function mapMembership(row: MembershipRow): EditorMembership {
  return {
    id: row.id,
    scrapbookId: row.scrapbook_id,
    email: row.email,
    userId: row.user_id,
    linkedAt: row.linked_at ? new Date(row.linked_at) : null,
    createdAt: new Date(row.created_at),
  };
}

export async function addEditor(
  db: SessionDatabase,
  scrapbookId: string,
  normalizedEmail: string,
): Promise<EditorMembership> {
  const result = await db.query<MembershipRow>(
    `
      INSERT INTO scrapbook_editors
        (scrapbook_id, email, user_id, linked_at)
      SELECT $1, $2, users.id,
        CASE WHEN users.id IS NULL THEN NULL ELSE NOW() END
      FROM (VALUES (1)) AS invitation(dummy)
      LEFT JOIN users ON users.email = $2
      ON CONFLICT (scrapbook_id, email)
      DO UPDATE SET user_id = EXCLUDED.user_id, linked_at = EXCLUDED.linked_at
      RETURNING id, scrapbook_id, email, user_id, linked_at, created_at
    `,
    [scrapbookId, normalizedEmail],
  );
  const row = result.rows[0];
  if (!row) {
    throw new Error("Editor membership creation did not return a membership");
  }

  return mapMembership(row);
}

export async function listEditors(
  db: SessionDatabase,
  scrapbookId: string,
): Promise<EditorMembership[]> {
  const result = await db.query<MembershipRow>(
    `
      SELECT id, scrapbook_id, email, user_id, linked_at, created_at
      FROM scrapbook_editors
      WHERE scrapbook_id = $1
      ORDER BY created_at ASC, id ASC
    `,
    [scrapbookId],
  );

  return result.rows.map(mapMembership);
}

export async function removeEditor(
  db: SessionDatabase,
  scrapbookId: string,
  membershipId: string,
): Promise<boolean> {
  const result = await db.query(
    `
      DELETE FROM scrapbook_editors
      WHERE scrapbook_id = $1 AND id = $2
    `,
    [scrapbookId, membershipId],
  );

  return (result.rowCount ?? 0) > 0;
}

export async function linkPendingMemberships(
  db: SessionDatabase,
  userId: string,
  normalizedEmail: string,
): Promise<void> {
  await db.query(
    `
      UPDATE scrapbook_editors
      SET user_id = $1, linked_at = NOW()
      WHERE email = $2 AND (user_id IS NULL OR user_id = $1)
    `,
    [userId, normalizedEmail],
  );
}
