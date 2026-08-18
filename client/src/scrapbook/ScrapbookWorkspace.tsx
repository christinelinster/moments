import { useEffect, useMemo, useState } from "react";
import type { Album, EditorMembership, MediaItem, Scrapbook } from "../api/types";
import { ApiError } from "../api/http";
import { Button } from "../components/Button";
import { Modal } from "../components/Modal";
import { Toast } from "../components/Toast";
import { AlbumDrawer } from "./AlbumDrawer";
import { AllMemoriesToolbar } from "./AllMemoriesToolbar";
import { MediaDetailsPanel } from "./MediaDetailsPanel";
import { MediaGrid } from "./MediaGrid";
import { UploadDropzone } from "./UploadDropzone";
import { bulkDeleteMedia, bulkMoveMedia, createAlbum, deleteAlbum, deleteMedia, reorderAlbums, reorderMedia, renameAlbum, updateMedia } from "./scrapbook-api";
import { addEditor, removeEditor, updateTheme } from "../collaborators/collaborator-api";
import { CollaboratorPanel } from "../collaborators/CollaboratorPanel";
import { ShareLinkPanel } from "../collaborators/ShareLinkPanel";
import { ThemePicker } from "./ThemePicker";
import type { ThemeKey } from "../api/types";
import type { StickerAsset, StickerPlacement } from "../api/types";
import { createPlacement, deletePlacement, deleteSticker, listPlacements, listStickers, updatePlacement, uploadSticker } from "../stickers/sticker-api";
import { StickerCanvasLayer } from "../stickers/StickerCanvasLayer";
import { StickerTray } from "../stickers/StickerTray";
import { PublicScrapbookPage } from "../public/PublicScrapbookPage";

type ModalState = { kind: "create" } | { kind: "rename"; album: Album } | { kind: "delete-album"; album: Album } | { kind: "move"; media: MediaItem } | { kind: "delete-media"; media: MediaItem } | { kind: "bulk-delete" } | null;

export function ScrapbookWorkspace({ scrapbook, albums, media, editors, currentUserId, role, onRefresh, onSignOut }: {
  scrapbook: Scrapbook;
  albums: Album[];
  media: MediaItem[];
  editors: EditorMembership[];
  currentUserId: string;
  role?: "owner" | "editor";
  onRefresh: () => Promise<void> | void;
  onSignOut?: () => Promise<void> | void;
}) {
  const [activeAlbumId, setActiveAlbumId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionAnchorId, setSelectionAnchorId] = useState<string | null>(null);
  const [detailsMedia, setDetailsMedia] = useState<MediaItem | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState<{ message: string; tone: "info" | "error" | "success" } | null>(null);
  const [panel, setPanel] = useState<"collaborators" | "share" | "theme" | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [stickerAssets, setStickerAssets] = useState<StickerAsset[]>([]);
  const [stickerPlacements, setStickerPlacements] = useState<StickerPlacement[]>([]);
  const currentRole = role ?? (scrapbook.ownerId === currentUserId ? "owner" : "editor");
  const activeAlbum = albums.find((album) => album.id === activeAlbumId) ?? null;
  const visibleMedia = useMemo(() => media.filter((item) => !activeAlbumId || item.albumId === activeAlbumId).slice().sort((a, b) => a.position - b.position || a.id.localeCompare(b.id)), [activeAlbumId, media]);

  useEffect(() => { void listStickers(scrapbook.id).then((result) => setStickerAssets(result.assets)).catch(() => setStickerAssets([])); }, [scrapbook.id]);
  useEffect(() => { if (!activeAlbumId) { setStickerPlacements([]); return; } void listPlacements(scrapbook.id, activeAlbumId).then((result) => setStickerPlacements(result.placements)).catch(() => setStickerPlacements([])); }, [activeAlbumId, scrapbook.id]);

  function reportError(error: unknown) {
    const message = error instanceof ApiError ? error.message : error instanceof Error ? error.message : "That action could not be saved.";
    setNotice({ message, tone: "error" });
  }

  async function refreshAfter(action: () => Promise<unknown>, success = "Saved") {
    try { await action(); await onRefresh(); setNotice({ message: success, tone: "success" }); } catch (error) { reportError(error); }
  }

  function selectMedia(id: string, checked: boolean, shiftKey = false) {
    setSelectedIds((current) => {
      const next = new Set(current);
      const anchorIndex = selectionAnchorId ? visibleMedia.findIndex((item) => item.id === selectionAnchorId) : -1;
      const targetIndex = visibleMedia.findIndex((item) => item.id === id);
      if (shiftKey && anchorIndex >= 0 && targetIndex >= 0) {
        const start = Math.min(anchorIndex, targetIndex);
        const end = Math.max(anchorIndex, targetIndex);
        for (const item of visibleMedia.slice(start, end + 1)) {
          if (checked) next.add(item.id);
          else next.delete(item.id);
        }
      } else if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
    if (!shiftKey || !selectionAnchorId) setSelectionAnchorId(id);
  }

  function moveOrder(item: MediaItem, direction: "up" | "down") {
    const sameAlbum = visibleMedia.filter((candidate) => candidate.albumId === item.albumId);
    const index = sameAlbum.findIndex((candidate) => candidate.id === item.id);
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || nextIndex < 0 || nextIndex >= sameAlbum.length) return;
    const ordered = [...sameAlbum];
    [ordered[index], ordered[nextIndex]] = [ordered[nextIndex], ordered[index]];
    void refreshAfter(() => reorderMedia(scrapbook.id, item.albumId, ordered.map((candidate) => candidate.id)), "Memory order saved");
  }

  function dropOrder(draggedId: string, targetId: string) {
    const dragged = visibleMedia.find((item) => item.id === draggedId);
    const target = visibleMedia.find((item) => item.id === targetId);
    if (!dragged || !target || dragged.albumId !== target.albumId) return;
    const ordered = visibleMedia.filter((item) => item.albumId === dragged.albumId);
    const from = ordered.findIndex((item) => item.id === draggedId);
    const to = ordered.findIndex((item) => item.id === targetId);
    if (from < 0 || to < 0 || from === to) return;
    const [moved] = ordered.splice(from, 1);
    ordered.splice(to, 0, moved);
    void refreshAfter(() => reorderMedia(scrapbook.id, dragged.albumId, ordered.map((item) => item.id)), "Memory order saved");
  }

  function dropMedia(albumId: string | null, mediaId: string) {
    if (!media.some((item) => item.id === mediaId) || media.find((item) => item.id === mediaId)?.albumId === albumId) return;
    void refreshAfter(() => bulkMoveMedia(scrapbook.id, [mediaId], albumId), "Memory moved");
  }

  function openCreate() { setDraft(""); setModal({ kind: "create" }); }
  function openRename(album: Album) { setDraft(album.name); setModal({ kind: "rename", album }); }
  function openMove(item: MediaItem) { setModal({ kind: "move", media: item }); }

  async function submitModal() {
    if (!modal) return;
    if (modal.kind === "create") await refreshAfter(async () => { await createAlbum(scrapbook.id, draft); setModal(null); }, "Album created");
    if (modal.kind === "rename") await refreshAfter(async () => { await renameAlbum(scrapbook.id, modal.album.id, draft); setModal(null); }, "Album renamed");
    if (modal.kind === "delete-album") await refreshAfter(async () => { await deleteAlbum(scrapbook.id, modal.album.id); if (activeAlbumId === modal.album.id) setActiveAlbumId(null); setModal(null); }, "Album deleted; memories kept");
    if (modal.kind === "move") await refreshAfter(async () => { await bulkMoveMedia(scrapbook.id, [modal.media.id], draft || null); setModal(null); }, "Memory moved");
    if (modal.kind === "delete-media") await refreshAfter(async () => { await deleteMedia(scrapbook.id, modal.media.id); setSelectedIds((current) => { const next = new Set(current); next.delete(modal.media.id); return next; }); setSelectionAnchorId((current) => current === modal.media.id ? null : current); setDetailsMedia(null); setModal(null); }, "Memory deleted");
    if (modal.kind === "bulk-delete") await refreshAfter(async () => { await bulkDeleteMedia(scrapbook.id, [...selectedIds]); setSelectedIds(new Set()); setSelectionAnchorId(null); setModal(null); }, "Selected memories deleted");
  }

  function reorderAlbum(albumId: string, direction: "up" | "down") {
    const index = albums.findIndex((album) => album.id === albumId);
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || nextIndex < 0 || nextIndex >= albums.length) return;
    const ordered = [...albums]; [ordered[index], ordered[nextIndex]] = [ordered[nextIndex], ordered[index]];
    void refreshAfter(() => reorderAlbums(scrapbook.id, ordered.map((album) => album.id)), "Album tabs reordered");
  }

  async function refreshStickers() {
    const result = await listStickers(scrapbook.id);
    setStickerAssets(result.assets);
    if (activeAlbumId) setStickerPlacements((await listPlacements(scrapbook.id, activeAlbumId)).placements);
  }

  return <div className={`scrapbook-app theme-${scrapbook.themeKey}`}>
    <header className="utility-bar"><div className="brand-lockup"><span className="brand-mark" aria-hidden="true">✳</span><div><p className="eyebrow">Field notes</p><h1>{scrapbook.title}</h1></div></div><div className="utility-actions"><span className="role-pill">{currentRole}</span><Button className="button-ghost" onClick={() => setPreviewOpen(true)}>Preview</Button><Button className="button-ghost" onClick={() => setPanel("theme")}>Theme</Button><Button className="button-ghost" onClick={() => setPanel("collaborators")}>Collaborators <span className="count-badge">{editors.length}</span></Button>{currentRole === "owner" && <Button className="button-ghost" onClick={() => setPanel("share")}>Public link</Button>}{onSignOut && <Button className="button-ghost" onClick={() => void onSignOut()}>Sign out</Button>}</div></header>
    <div className="workspace-layout">
      <AlbumDrawer albums={albums} activeAlbumId={activeAlbumId} onSelect={setActiveAlbumId} onCreate={openCreate} onRename={openRename} onDelete={(album) => setModal({ kind: "delete-album", album })} onReorder={reorderAlbum} onDropMedia={dropMedia} />
      <section className="paper-spread" role="region" aria-label="Paper spread" onDragOver={(event) => event.preventDefault()}>
        <div className="spread-header"><div><p className="eyebrow">{activeAlbum ? `Spread ${String((albums.indexOf(activeAlbum) + 1)).padStart(2, "0")}` : "The whole story"}</p><h2>{activeAlbum?.name ?? "All memories"}</h2></div><div className="spread-meta"><span>{visibleMedia.length} {visibleMedia.length === 1 ? "memory" : "memories"}</span><Button className="button-primary" onClick={() => document.querySelector<HTMLInputElement>(".upload-dropzone input")?.click()}>Add memories</Button></div></div>
        <UploadDropzone scrapbookId={scrapbook.id} albumId={activeAlbumId} onUploaded={() => void onRefresh()} onError={(message) => setNotice({ message, tone: "error" })} />
        <AllMemoriesToolbar selectedCount={selectedIds.size} albums={albums} onMove={(albumId) => void refreshAfter(async () => { await bulkMoveMedia(scrapbook.id, [...selectedIds], albumId); setSelectedIds(new Set()); setSelectionAnchorId(null); }, "Selected memories moved")} onDelete={() => setModal({ kind: "bulk-delete" })} onClear={() => { setSelectedIds(new Set()); setSelectionAnchorId(null); }} />
        <MediaGrid media={visibleMedia} selectedIds={selectedIds} onSelect={selectMedia} onOpenDetails={setDetailsMedia} onMove={openMove} onDelete={(item) => setModal({ kind: "delete-media", media: item })} onReorder={moveOrder} onDropReorder={dropOrder} />
        {activeAlbumId && <><StickerCanvasLayer editable placements={stickerPlacements} assets={stickerAssets} onChange={async (placement) => { const result = await updatePlacement(scrapbook.id, activeAlbumId, placement.id, placement); setStickerPlacements((current) => current.map((item) => item.id === result.placement.id ? result.placement : item)); }} onDelete={async (placement) => { await deletePlacement(scrapbook.id, activeAlbumId, placement.id); setStickerPlacements((current) => current.filter((item) => item.id !== placement.id)); }} /><StickerTray assets={stickerAssets} onUpload={async (file) => { await uploadSticker(scrapbook.id, file); await refreshStickers(); }} onDelete={async (asset) => { await deleteSticker(scrapbook.id, asset.id); setStickerAssets((current) => current.filter((item) => item.id !== asset.id)); setStickerPlacements((current) => current.filter((item) => item.stickerAssetId !== asset.id)); try { await refreshStickers(); } catch (error) { reportError(error); } }} onChoose={async (asset) => { const result = await createPlacement(scrapbook.id, activeAlbumId, { stickerAssetId: asset.id, x: 50, y: 50, scale: 1, rotation: 0, layer: stickerPlacements.length }); setStickerPlacements((current) => [...current, result.placement]); }} /></>}
      </section>
      <MediaDetailsPanel media={detailsMedia} onClose={() => setDetailsMedia(null)} onSave={async (updates) => { if (!detailsMedia) return; await refreshAfter(async () => { const response = await updateMedia(scrapbook.id, detailsMedia.id, updates); setDetailsMedia(response.media); }, "Details saved"); }} />
    </div>
    <div className="mobile-action-bar"><Button onClick={openCreate}>New album</Button><Button className="button-primary" onClick={() => document.querySelector<HTMLInputElement>(".upload-dropzone input")?.click()}>Add memory</Button><Button onClick={() => setActiveAlbumId(null)}>All memories</Button></div>
    {notice && <Toast message={notice.message} tone={notice.tone} />}
    {panel === "collaborators" && <div className="panel-backdrop"><CollaboratorPanel currentRole={currentRole} members={editors} onClose={() => setPanel(null)} onAdd={async (email) => { await addEditor(scrapbook.id, email); await onRefresh(); }} onRemove={async (membershipId) => { await removeEditor(scrapbook.id, membershipId); await onRefresh(); }} /></div>}
    {panel === "share" && <div className="panel-backdrop"><ShareLinkPanel scrapbookId={scrapbook.id} canManage={currentRole === "owner"} onClose={() => setPanel(null)} /></div>}
    {panel === "theme" && <div className="panel-backdrop"><section className="side-panel" aria-labelledby="theme-title"><div className="side-panel-header"><div><p className="eyebrow">Choose the weather</p><h2 id="theme-title">Theme</h2></div><button className="icon-button" type="button" onClick={() => setPanel(null)} aria-label="Close theme picker">×</button></div><ThemePicker value={(scrapbook.themeKey as ThemeKey) || "field-journal"} canEdit onChange={async (theme) => { await updateTheme(scrapbook.id, theme); await onRefresh(); setPanel(null); }} /></section></div>}
    {previewOpen && <div className="preview-backdrop"><div className="preview-frame"><PublicScrapbookPage previewScrapbookId={scrapbook.id} onClose={() => setPreviewOpen(false)} /></div></div>}
    {modal && <Modal title={modal.kind === "create" ? "New album" : modal.kind === "rename" ? "Rename album" : modal.kind === "move" ? "Move memory" : modal.kind === "delete-album" ? "Delete album?" : modal.kind === "delete-media" ? "Delete this memory?" : "Delete selected memories?"} onClose={() => setModal(null)}>
      {(modal.kind === "create" || modal.kind === "rename") && <form className="modal-form" onSubmit={(event) => { event.preventDefault(); void submitModal(); }}><label>Album name<input autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} required maxLength={120} /></label><div className="modal-actions"><Button type="button" onClick={() => setModal(null)}>Cancel</Button><Button className="button-primary" type="submit">Save</Button></div></form>}
      {modal.kind === "move" && <form className="modal-form" onSubmit={(event) => { event.preventDefault(); void submitModal(); }}><label>Album<select autoFocus value={draft} onChange={(event) => setDraft(event.target.value)}><option value="">All memories</option>{albums.map((album) => <option key={album.id} value={album.id}>{album.name}</option>)}</select></label><div className="modal-actions"><Button type="button" onClick={() => setModal(null)}>Cancel</Button><Button className="button-primary" type="submit">Move memory</Button></div></form>}
      {(modal.kind === "delete-album" || modal.kind === "delete-media" || modal.kind === "bulk-delete") && <div className="modal-form"><p>{modal.kind === "delete-album" ? "The album will disappear, but its memories will stay safe in All memories." : modal.kind === "bulk-delete" ? `This will permanently remove ${selectedIds.size} stored memories.` : "This removes the stored file and its scrapbook record."}</p><div className="modal-actions"><Button type="button" onClick={() => setModal(null)}>Keep it</Button><Button className="button-danger" type="button" onClick={() => void submitModal()}>Delete</Button></div></div>}
    </Modal>}
  </div>;
}
