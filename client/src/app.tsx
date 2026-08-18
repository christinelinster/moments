import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError } from "./api/http";
import type { Album, MediaItem, Scrapbook, ScrapbookSnapshot } from "./api/types";
import { AuthPage } from "./auth/AuthPage";
import { AuthProvider, useAuth } from "./auth/AuthProvider";
import { EmptyState } from "./components/EmptyState";
import { Button } from "./components/Button";
import { createScrapbook, loadAlbums, listMedia, listScrapbooks, loadScrapbook } from "./scrapbook/scrapbook-api";
import { ScrapbookWorkspace } from "./scrapbook/ScrapbookWorkspace";
import { PublicScrapbookPage } from "./public/PublicScrapbookPage";

function selectedIdFromLocation(): string | null {
  const match = window.location.pathname.match(/^\/edit\/([^/]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function AuthenticatedApp() {
  const { user, signOut } = useAuth();
  const [scrapbooks, setScrapbooks] = useState<Scrapbook[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(() => selectedIdFromLocation());
  const [snapshot, setSnapshot] = useState<ScrapbookSnapshot | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    const result = await listScrapbooks();
    setScrapbooks(result.scrapbooks);
    setSelectedId((current) => current && result.scrapbooks.some((item) => item.id === current) ? current : result.scrapbooks[0]?.id ?? null);
  }, []);

  useEffect(() => {
    void loadList().catch((requestError) => { setError(requestError instanceof Error ? requestError.message : "Could not load your scrapbooks."); setStatus("error"); });
  }, [loadList]);

  const loadWorkspace = useCallback(async () => {
    if (!selectedId) { setSnapshot(null); setAlbums([]); setMedia([]); setStatus("ready"); return; }
    setStatus("loading");
    try {
      const [nextSnapshot, nextAlbums, nextMedia] = await Promise.all([loadScrapbook(selectedId), loadAlbums(selectedId), listMedia(selectedId)]);
      setSnapshot(nextSnapshot); setAlbums(nextAlbums.albums); setMedia(nextMedia.media); setError(null); setStatus("ready");
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) { await signOut(); return; }
      setError(requestError instanceof Error ? requestError.message : "Could not load this scrapbook."); setStatus("error");
    }
  }, [selectedId, signOut]);

  useEffect(() => { void loadWorkspace(); }, [loadWorkspace]);

  function chooseScrapbook(id: string) {
    setSelectedId(id);
    window.history.replaceState({}, "", `/edit/${encodeURIComponent(id)}`);
  }

  if (status === "loading" && !snapshot) return <main className="loading-page"><span className="loader" aria-hidden="true" /><p>Setting the paper on your desk...</p></main>;
  if (status === "error") return <main className="loading-page"><p className="form-error" role="alert">{error}</p><Button className="button-primary" onClick={() => { setStatus("loading"); void loadList(); }}>Try again</Button></main>;
  if (!snapshot || !selectedId) return <ScrapbookPicker scrapbooks={scrapbooks} onCreated={async (created) => { await loadList(); chooseScrapbook(created.id); }} onSelect={chooseScrapbook} onSignOut={signOut} />;

  return <ScrapbookWorkspace scrapbook={snapshot.scrapbook} albums={albums} media={media} editors={snapshot.editors} currentUserId={user!.id} role={snapshot.role} onRefresh={loadWorkspace} onSignOut={signOut} />;
}

function ScrapbookPicker({ scrapbooks, onCreated, onSelect, onSignOut }: { scrapbooks: Scrapbook[]; onCreated: (scrapbook: Scrapbook) => Promise<void>; onSelect: (id: string) => void; onSignOut: () => Promise<void> }) {
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  async function create() {
    if (!title.trim()) return;
    setBusy(true);
    try { const result = await createScrapbook(title.trim()); await onCreated(result.scrapbook); } finally { setBusy(false); }
  }
  return <main className="picker-page"><div className="picker-card"><div className="picker-header"><div><p className="eyebrow">The shelf</p><h1>Choose a scrapbook</h1></div><Button className="button-ghost" onClick={() => void onSignOut()}>Sign out</Button></div>{scrapbooks.length ? <div className="scrapbook-list">{scrapbooks.map((book) => <button key={book.id} type="button" onClick={() => onSelect(book.id)}><span className="book-spine" aria-hidden="true" /><span><strong>{book.title}</strong><small>{book.themeKey}</small></span><span aria-hidden="true">→</span></button>)}</div> : <EmptyState title="No scrapbook yet" description="Start with a title, then fill the first spread." />}<div className="new-scrapbook"><label>New scrapbook<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="A summer in the city" /></label><Button className="button-primary" onClick={() => void create()} disabled={busy || !title.trim()}>{busy ? "Making room..." : "Create scrapbook"}</Button></div></div></main>;
}

export function App() {
  const publicMatch = useMemo(() => window.location.pathname.match(/^\/shared\/([^/]+)/), []);
  if (publicMatch) return <PublicScrapbookPage shareToken={decodeURIComponent(publicMatch[1])} />;
  return <AuthProvider><AuthGate /></AuthProvider>;
}

function AuthGate() {
  const { status } = useAuth();
  if (status === "loading") return <main className="loading-page"><span className="loader" aria-hidden="true" /><p>Warming up the desk...</p></main>;
  if (status === "unauthenticated") return <AuthPage />;
  return <AuthenticatedApp />;
}
