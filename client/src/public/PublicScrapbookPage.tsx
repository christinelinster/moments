import { useEffect, useMemo, useState } from "react";
import type { Album, PublicSnapshot } from "../api/types";
import { ApiError } from "../api/http";
import { EmptyState } from "../components/EmptyState";
import { loadPreviewSnapshot, loadPublicSnapshot } from "./public-api";
import { PublicAlbumView } from "./PublicAlbumView";
import { buildPlaybackSequence } from "./playback-sequence";
import { PlaybackPlayer } from "./PlaybackPlayer";

export function PublicScrapbookPage({ shareToken, previewScrapbookId, onClose }: { shareToken?: string; previewScrapbookId?: string; onClose?: () => void }) {
  const [snapshot, setSnapshot] = useState<PublicSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const [playback, setPlayback] = useState<ReturnType<typeof buildPlaybackSequence> | null>(null);
  const isPreview = Boolean(previewScrapbookId);
  useEffect(() => {
    setSnapshot(null);
    setError(null);
    const load = previewScrapbookId
      ? loadPreviewSnapshot(previewScrapbookId)
      : shareToken
        ? loadPublicSnapshot(shareToken)
        : Promise.reject(new Error("A scrapbook preview is missing its ID."));
    void load.then(setSnapshot).catch((requestError) => setError(
      requestError instanceof ApiError && requestError.status === 404 && !isPreview
        ? "This share link is no longer available."
        : "The scrapbook could not be opened.",
    ));
  }, [isPreview, previewScrapbookId, shareToken]);
  const selectedAlbum = snapshot?.albums.find((album) => album.id === selectedAlbumId) ?? null;
  const selectedMedia = useMemo(() => selectedAlbum ? snapshot?.media.filter((item) => item.albumId === selectedAlbum.id) ?? [] : snapshot?.media ?? [], [selectedAlbum, snapshot]);
  if (error) return <main className="public-error"><EmptyState title="The scrapbook is closed" description={error} /></main>;
  if (!snapshot) return <main className="public-loading"><span className="loader" aria-hidden="true" /><p>Opening the scrapbook...</p></main>;
  function play(scope: "album" | "all", albumId?: string) { setPlayback(buildPlaybackSequence(snapshot!, scope, albumId)); }
  return <div className={`public-app theme-${snapshot.scrapbook.themeKey}`}><header className="public-header"><div><p className="eyebrow">{isPreview ? "Editor preview" : "A shared scrapbook"}</p><h1>{snapshot.scrapbook.title}</h1></div><div className="public-header-actions"><span className="public-mark" aria-hidden="true">✳</span>{onClose && <button type="button" className="public-preview-close" onClick={onClose}>Close preview</button>}</div></header><main className="public-main"><section className="public-cover"><p className="public-kicker">Made to be looked through slowly</p><h2>{selectedAlbum?.name ?? "The whole story"}</h2><p>{snapshot.media.length} {snapshot.media.length === 1 ? "memory" : "memories"} across {snapshot.albums.length} {snapshot.albums.length === 1 ? "album" : "albums"}.</p><button className="public-play-button" type="button" onClick={() => play(selectedAlbum ? "album" : "all", selectedAlbum?.id)}>{selectedAlbum ? "Play this album" : "Start the story"} <span aria-hidden="true">↗</span></button></section><nav className="public-album-tabs" aria-label="Scrapbook albums"><button type="button" className={!selectedAlbumId ? "active" : ""} onClick={() => setSelectedAlbumId(null)}>All memories <small>{snapshot.media.length}</small></button>{snapshot.albums.map((album) => <button type="button" key={album.id} className={selectedAlbumId === album.id ? "active" : ""} onClick={() => setSelectedAlbumId(album.id)}>{album.name}<small>{snapshot.media.filter((item) => item.albumId === album.id).length}</small></button>)}</nav><PublicAlbumView album={selectedAlbum} media={selectedMedia} snapshot={snapshot} onPlay={play} /></main>{playback && <div className="playback-backdrop"><PlaybackPlayer items={playback} onExit={() => setPlayback(null)} reducedMotion={window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false} /></div>}</div>;
}
