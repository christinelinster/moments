import { apiFetch, jsonBody } from "../api/http";
import type { Album, EditorMembership, MediaItem, Scrapbook, ScrapbookSnapshot } from "../api/types";

export function listScrapbooks(): Promise<{ scrapbooks: Scrapbook[] }> {
  return apiFetch<{ scrapbooks: Scrapbook[] }>("/api/scrapbooks");
}

export function createScrapbook(title: string): Promise<{ scrapbook: Scrapbook }> {
  return apiFetch<{ scrapbook: Scrapbook }>("/api/scrapbooks", {
    method: "POST",
    body: jsonBody({ title }),
  });
}

export function loadScrapbook(scrapbookId: string): Promise<ScrapbookSnapshot> {
  return apiFetch<ScrapbookSnapshot>(`/api/scrapbooks/${encodeURIComponent(scrapbookId)}`);
}

export function updateScrapbook(scrapbookId: string, updates: { title?: string; themeKey?: string }): Promise<{ scrapbook: Scrapbook }> {
  return apiFetch<{ scrapbook: Scrapbook }>(`/api/scrapbooks/${encodeURIComponent(scrapbookId)}`, {
    method: "PATCH",
    body: jsonBody(updates),
  });
}

export function loadAlbums(scrapbookId: string): Promise<{ albums: Album[] }> {
  return apiFetch<{ albums: Album[] }>(`/api/albums/${encodeURIComponent(scrapbookId)}`);
}

export function createAlbum(scrapbookId: string, name: string): Promise<{ album: Album }> {
  return apiFetch<{ album: Album }>(`/api/albums/${encodeURIComponent(scrapbookId)}`, {
    method: "POST",
    body: jsonBody({ name }),
  });
}

export function renameAlbum(scrapbookId: string, albumId: string, name: string): Promise<{ album: Album }> {
  return apiFetch<{ album: Album }>(`/api/albums/${encodeURIComponent(scrapbookId)}/${encodeURIComponent(albumId)}`, {
    method: "PATCH",
    body: jsonBody({ name }),
  });
}

export function reorderAlbums(scrapbookId: string, orderedIds: string[]): Promise<void> {
  return apiFetch<void>(`/api/albums/${encodeURIComponent(scrapbookId)}/reorder`, {
    method: "POST",
    body: jsonBody({ orderedIds }),
  });
}

export function deleteAlbum(scrapbookId: string, albumId: string): Promise<void> {
  return apiFetch<void>(`/api/albums/${encodeURIComponent(scrapbookId)}/${encodeURIComponent(albumId)}`, { method: "DELETE" });
}

export function listMedia(scrapbookId: string, albumId?: string | null): Promise<{ media: MediaItem[] }> {
  const query = albumId ? `?albumId=${encodeURIComponent(albumId)}` : "";
  return apiFetch<{ media: MediaItem[] }>(`/api/media/${encodeURIComponent(scrapbookId)}${query}`);
}

export function uploadMedia(scrapbookId: string, file: File, albumId?: string | null): Promise<{ media: MediaItem }> {
  const form = new FormData();
  form.append("file", file);
  if (albumId) form.append("albumId", albumId);
  return apiFetch<{ media: MediaItem }>(`/api/media/${encodeURIComponent(scrapbookId)}`, {
    method: "POST",
    body: form,
  });
}

export function updateMedia(scrapbookId: string, mediaId: string, updates: { caption?: string | null; location?: string | null }): Promise<{ media: MediaItem }> {
  return apiFetch<{ media: MediaItem }>(`/api/media/${encodeURIComponent(scrapbookId)}/${encodeURIComponent(mediaId)}`, {
    method: "PATCH",
    body: jsonBody(updates),
  });
}

export function reorderMedia(scrapbookId: string, albumId: string | null, orderedIds: string[]): Promise<void> {
  return apiFetch<void>(`/api/media/${encodeURIComponent(scrapbookId)}/reorder`, {
    method: "POST",
    body: jsonBody({ albumId, orderedIds }),
  });
}

export function bulkMoveMedia(scrapbookId: string, mediaIds: string[], albumId: string | null): Promise<void> {
  return apiFetch<void>(`/api/media/${encodeURIComponent(scrapbookId)}/bulk-move`, {
    method: "POST",
    body: jsonBody({ mediaIds, albumId }),
  });
}

export function deleteMedia(scrapbookId: string, mediaId: string): Promise<void> {
  return apiFetch<void>(`/api/media/${encodeURIComponent(scrapbookId)}/${encodeURIComponent(mediaId)}`, { method: "DELETE" });
}

export function bulkDeleteMedia(scrapbookId: string, mediaIds: string[]): Promise<void> {
  return apiFetch<void>(`/api/media/${encodeURIComponent(scrapbookId)}/bulk-delete`, {
    method: "POST",
    body: jsonBody({ mediaIds }),
  });
}

export type ScrapbookEditor = EditorMembership;
