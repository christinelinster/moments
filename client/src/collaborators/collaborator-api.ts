import { apiFetch, jsonBody } from "../api/http";
import type { EditorMembership, Scrapbook, ThemeKey } from "../api/types";

export function listEditors(scrapbookId: string): Promise<{ editors: EditorMembership[] }> { return apiFetch(`/api/scrapbooks/${encodeURIComponent(scrapbookId)}/editors`); }
export function addEditor(scrapbookId: string, email: string): Promise<{ editor: EditorMembership }> { return apiFetch(`/api/scrapbooks/${encodeURIComponent(scrapbookId)}/editors`, { method: "POST", body: jsonBody({ email }) }); }
export function removeEditor(scrapbookId: string, membershipId: string): Promise<void> { return apiFetch(`/api/scrapbooks/${encodeURIComponent(scrapbookId)}/editors/${encodeURIComponent(membershipId)}`, { method: "DELETE" }); }
export function updateTheme(scrapbookId: string, themeKey: ThemeKey): Promise<{ scrapbook: Scrapbook }> { return apiFetch(`/api/scrapbooks/${encodeURIComponent(scrapbookId)}/theme`, { method: "PATCH", body: jsonBody({ themeKey }) }); }
export function getShareLink(scrapbookId: string): Promise<{ shareToken: string; enabled: boolean }> { return apiFetch(`/api/scrapbooks/${encodeURIComponent(scrapbookId)}/share-link`); }
export function rotateShareLink(scrapbookId: string): Promise<{ shareToken: string; enabled: boolean }> { return apiFetch(`/api/scrapbooks/${encodeURIComponent(scrapbookId)}/share-link/rotate`, { method: "POST" }); }
export function enableShareLink(scrapbookId: string): Promise<{ shareToken: string; enabled: boolean }> { return apiFetch(`/api/scrapbooks/${encodeURIComponent(scrapbookId)}/share-link/enable`, { method: "POST" }); }
export function disableShareLink(scrapbookId: string): Promise<{ shareToken: string; enabled: boolean }> { return apiFetch(`/api/scrapbooks/${encodeURIComponent(scrapbookId)}/share-link/disable`, { method: "POST" }); }
