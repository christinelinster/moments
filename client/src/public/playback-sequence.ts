import type { PublicSnapshot, StickerAsset, StickerPlacement } from "../api/types";

export type PlaybackItem = {
  id: string;
  albumId: string | null;
  albumName: string;
  originalName: string;
  mediaType: string;
  mimeType: string;
  fileUrl: string;
  caption: string | null;
  location: string | null;
  stickerPlacements: StickerPlacement[];
  stickerAssets?: StickerAsset[];
};

export function buildPlaybackSequence(snapshot: PublicSnapshot, scope: "album" | "all", albumId?: string): PlaybackItem[] {
  const albums = [...snapshot.albums].sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
  const albumById = new Map(albums.map((album) => [album.id, album]));
  const media = [...snapshot.media];
  const forAlbum = (id: string) => media.filter((item) => item.albumId === id).sort((a, b) => a.position - b.position || a.id.localeCompare(b.id)).map((item) => itemToPlayback(item, albumById.get(id)?.name ?? "Album", snapshot.stickerPlacements, snapshot.stickerAssets));
  if (scope === "album") return albumId && albumById.has(albumId) ? forAlbum(albumId) : [];
  const ordered = albums.flatMap((album) => forAlbum(album.id));
  const unassigned = media.filter((item) => item.albumId === null).sort((a, b) => a.position - b.position || a.id.localeCompare(b.id)).map((item) => itemToPlayback(item, "All memories", snapshot.stickerPlacements, snapshot.stickerAssets));
  return [...ordered, ...unassigned];
}

function itemToPlayback(item: PublicSnapshot["media"][number], albumName: string, placements: StickerPlacement[], assets: StickerAsset[]): PlaybackItem {
  const itemPlacements = placements.filter((placement) => placement.albumId === item.albumId);
  const assetIds = new Set(itemPlacements.map((placement) => placement.stickerAssetId));
  return { id: item.id, albumId: item.albumId, albumName, originalName: item.originalName, mediaType: item.mediaType, mimeType: item.mimeType, fileUrl: item.fileUrl, caption: item.caption, location: item.location, stickerPlacements: itemPlacements, stickerAssets: assets.filter((asset) => assetIds.has(asset.id)) };
}
