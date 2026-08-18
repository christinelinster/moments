import { apiFetch } from "../api/http";
import type { PublicSnapshot } from "../api/types";

export function loadPublicSnapshot(shareToken: string): Promise<PublicSnapshot> { return apiFetch<PublicSnapshot>(`/api/public/${encodeURIComponent(shareToken)}`); }

export function loadPreviewSnapshot(scrapbookId: string): Promise<PublicSnapshot> {
  return apiFetch<PublicSnapshot>(`/api/scrapbooks/${encodeURIComponent(scrapbookId)}/preview`);
}
