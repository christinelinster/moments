import type { SessionDatabase, TransactionalDatabase } from "../auth/sessions.js";
import { AppError } from "../errors.js";

export type StickerAsset = {
  id: string;
  scrapbookId: string;
  storageKey: string;
  originalName: string;
  mimeType: string;
  byteSize: number;
  createdBy: string | null;
  createdAt: Date;
};

export type StickerPlacement = {
  id: string;
  scrapbookId: string;
  albumId: string;
  stickerAssetId: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  layer: number;
};

type AssetRow = { id: string; scrapbook_id: string; storage_key: string; original_name: string; mime_type: string; byte_size: string | number; created_by: string | null; created_at: Date | string };
type PlacementRow = { id: string; scrapbook_id: string; album_id: string; sticker_asset_id: string; x: string | number; y: string | number; scale: string | number; rotation: string | number; layer: number };

function numeric(value: string | number): number { return typeof value === "number" ? value : Number(value); }
function asset(row: AssetRow): StickerAsset { return { id: row.id, scrapbookId: row.scrapbook_id, storageKey: row.storage_key, originalName: row.original_name, mimeType: row.mime_type, byteSize: numeric(row.byte_size), createdBy: row.created_by, createdAt: new Date(row.created_at) }; }
function placement(row: PlacementRow): StickerPlacement { return { id: row.id, scrapbookId: row.scrapbook_id, albumId: row.album_id, stickerAssetId: row.sticker_asset_id, x: numeric(row.x), y: numeric(row.y), scale: numeric(row.scale), rotation: numeric(row.rotation), layer: row.layer }; }

export function normalizePlacement(input: { x: number; y: number; scale: number; rotation: number; layer: number }) {
  if (![input.x, input.y, input.scale, input.rotation, input.layer].every(Number.isFinite)) throw new AppError(400, "Sticker placement values must be numbers", "INVALID_PLACEMENT");
  return { x: Math.min(100, Math.max(0, input.x)), y: Math.min(100, Math.max(0, input.y)), scale: Math.min(4, Math.max(0.1, input.scale)), rotation: Math.min(180, Math.max(-180, input.rotation)), layer: Math.min(1000000, Math.max(0, Math.round(input.layer))) };
}

const assetColumns = "id, scrapbook_id, storage_key, original_name, mime_type, byte_size, created_by, created_at";
const placementColumns = "id, scrapbook_id, album_id, sticker_asset_id, x, y, scale, rotation, layer";

export async function listStickerAssets(db: SessionDatabase, scrapbookId: string): Promise<StickerAsset[]> {
  const result = await db.query<AssetRow>(`SELECT ${assetColumns} FROM sticker_assets WHERE scrapbook_id = $1 ORDER BY created_at ASC, id ASC`, [scrapbookId]);
  return result.rows.map(asset);
}

export async function createStickerAsset(db: SessionDatabase, input: Omit<StickerAsset, "id" | "createdAt">): Promise<StickerAsset> {
  const result = await db.query<AssetRow>(`INSERT INTO sticker_assets (scrapbook_id, storage_key, original_name, mime_type, byte_size, created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING ${assetColumns}`, [input.scrapbookId, input.storageKey, input.originalName, input.mimeType, input.byteSize, input.createdBy]);
  const row = result.rows[0]; if (!row) throw new Error("Sticker asset creation did not return an asset"); return asset(row);
}

export async function findStickerAsset(db: SessionDatabase, scrapbookId: string, assetId: string): Promise<StickerAsset | null> {
  const result = await db.query<AssetRow>(`SELECT ${assetColumns} FROM sticker_assets WHERE scrapbook_id = $1 AND id = $2`, [scrapbookId, assetId]);
  return result.rows[0] ? asset(result.rows[0]) : null;
}

export async function deleteStickerAsset(db: SessionDatabase, scrapbookId: string, assetId: string): Promise<StickerAsset | null> {
  const result = await db.query<AssetRow>(`DELETE FROM sticker_assets WHERE scrapbook_id = $1 AND id = $2 RETURNING ${assetColumns}`, [scrapbookId, assetId]);
  return result.rows[0] ? asset(result.rows[0]) : null;
}

export async function listStickerPlacements(db: SessionDatabase, scrapbookId: string, albumId: string): Promise<StickerPlacement[]> {
  const result = await db.query<PlacementRow>(`SELECT ${placementColumns} FROM sticker_placements WHERE scrapbook_id = $1 AND album_id = $2 ORDER BY layer ASC, id ASC`, [scrapbookId, albumId]);
  return result.rows.map(placement);
}

export async function createStickerPlacement(db: SessionDatabase, input: Omit<StickerPlacement, "id">): Promise<StickerPlacement> {
  const values = normalizePlacement(input);
  const result = await db.query<PlacementRow>(`INSERT INTO sticker_placements (scrapbook_id, album_id, sticker_asset_id, x, y, scale, rotation, layer) SELECT $1,$2,$3,$4,$5,$6,$7,$8 WHERE EXISTS (SELECT 1 FROM albums WHERE id = $2 AND scrapbook_id = $1) AND EXISTS (SELECT 1 FROM sticker_assets WHERE id = $3 AND scrapbook_id = $1) RETURNING ${placementColumns}`, [input.scrapbookId, input.albumId, input.stickerAssetId, values.x, values.y, values.scale, values.rotation, values.layer]);
  const row = result.rows[0]; if (!row) throw new AppError(404, "Album or sticker was not found", "STICKER_TARGET_NOT_FOUND"); return placement(row);
}

export async function updateStickerPlacement(db: SessionDatabase, scrapbookId: string, albumId: string, placementId: string, updates: Partial<Pick<StickerPlacement, "x" | "y" | "scale" | "rotation" | "layer">>): Promise<StickerPlacement | null> {
  const current = await db.query<PlacementRow>(`SELECT ${placementColumns} FROM sticker_placements WHERE scrapbook_id = $1 AND album_id = $2 AND id = $3`, [scrapbookId, albumId, placementId]);
  const row = current.rows[0]; if (!row) return null;
  const values = normalizePlacement({ x: updates.x ?? numeric(row.x), y: updates.y ?? numeric(row.y), scale: updates.scale ?? numeric(row.scale), rotation: updates.rotation ?? numeric(row.rotation), layer: updates.layer ?? row.layer });
  const result = await db.query<PlacementRow>(`UPDATE sticker_placements SET x=$4,y=$5,scale=$6,rotation=$7,layer=$8,updated_at=NOW() WHERE scrapbook_id=$1 AND album_id=$2 AND id=$3 RETURNING ${placementColumns}`, [scrapbookId, albumId, placementId, values.x, values.y, values.scale, values.rotation, values.layer]);
  return result.rows[0] ? placement(result.rows[0]) : null;
}

export async function deleteStickerPlacement(db: SessionDatabase, scrapbookId: string, albumId: string, placementId: string): Promise<boolean> { const result = await db.query(`DELETE FROM sticker_placements WHERE scrapbook_id=$1 AND album_id=$2 AND id=$3`, [scrapbookId, albumId, placementId]); return (result.rowCount ?? 0) > 0; }

export async function reorderStickerPlacements(db: TransactionalDatabase, scrapbookId: string, albumId: string, orderedIds: string[]): Promise<void> {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query<{ id: string }>(`SELECT id FROM sticker_placements WHERE scrapbook_id=$1 AND album_id=$2 ORDER BY layer ASC, id ASC FOR UPDATE`, [scrapbookId, albumId]);
    const ids = existing.rows.map((row) => row.id);
    if (ids.length !== orderedIds.length || orderedIds.some((id) => !ids.includes(id))) throw new AppError(400, "orderedIds must contain every placement", "INVALID_ORDER");
    for (const [index, id] of orderedIds.entries()) await client.query("UPDATE sticker_placements SET layer=$4, updated_at=NOW() WHERE scrapbook_id=$1 AND album_id=$2 AND id=$3", [scrapbookId, albumId, id, index]);
    await client.query("COMMIT");
  } catch (error) { await client.query("ROLLBACK").catch(() => undefined); throw error; } finally { client.release(); }
}

export type StickerFileAccess = { storageKey: string; originalName: string; mimeType: string; byteSize: number; scrapbookId: string };
export async function findStickerFileAccess(db: SessionDatabase, assetId: string, access: { userId?: string; shareToken?: string }): Promise<StickerFileAccess | null> {
  const result = await db.query<AssetRow>(`SELECT sa.${assetColumns.replaceAll(", ", ", sa.")} FROM sticker_assets sa JOIN scrapbooks s ON s.id=sa.scrapbook_id LEFT JOIN scrapbook_editors e ON e.scrapbook_id=s.id AND e.user_id=$2 WHERE sa.id=$1 AND ((s.public_share_token=$3 AND s.share_enabled=TRUE) OR s.owner_id=$2 OR e.user_id IS NOT NULL) LIMIT 1`, [assetId, access.userId ?? null, access.shareToken ?? null]);
  const row = result.rows[0]; if (!row) return null; const item = asset(row); return { storageKey: item.storageKey, originalName: item.originalName, mimeType: item.mimeType, byteSize: item.byteSize, scrapbookId: item.scrapbookId };
}
