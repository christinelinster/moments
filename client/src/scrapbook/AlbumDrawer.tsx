import type { DragEvent } from "react";
import type { Album } from "../api/types";
import { Button } from "../components/Button";

export function AlbumDrawer({ albums, activeAlbumId, onSelect, onCreate, onRename, onDelete, onReorder, onDropMedia }: {
  albums: Album[];
  activeAlbumId: string | null;
  onSelect: (albumId: string | null) => void;
  onCreate: () => void;
  onRename: (album: Album) => void;
  onDelete: (album: Album) => void;
  onReorder: (albumId: string, direction: "up" | "down") => void;
  onDropMedia?: (albumId: string | null, mediaId: string) => void;
}) {
  function drop(event: DragEvent<HTMLButtonElement>, albumId: string | null) {
    event.preventDefault();
    const mediaId = event.dataTransfer.getData("text/media-id");
    if (mediaId) onDropMedia?.(albumId, mediaId);
  }
  return <nav className="memory-drawer" aria-label="Memory drawer">
    <div className="drawer-heading"><div><p className="eyebrow">Your chapters</p><h2>Albums</h2></div><Button className="button-small" onClick={onCreate} aria-label="Create album">+</Button></div>
    <button className={`album-tab ${activeAlbumId === null ? "active" : ""}`} type="button" onDragOver={(event) => event.preventDefault()} onDrop={(event) => drop(event, null)} onClick={() => onSelect(null)}><span>All memories</span><small>Everywhere</small></button>
    <div className="album-list">
      {albums.map((album, index) => <div className={`album-row ${activeAlbumId === album.id ? "active" : ""}`} key={album.id}>
        <button className="album-tab" type="button" onDragOver={(event) => event.preventDefault()} onDrop={(event) => drop(event, album.id)} onClick={() => onSelect(album.id)}><span>{album.name}</span><small>Spread {String(index + 1).padStart(2, "0")}</small></button>
        <div className="album-actions">
          <button type="button" onClick={() => onReorder(album.id, "up")} disabled={index === 0} aria-label={`Move ${album.name} up`}>↑</button>
          <button type="button" onClick={() => onReorder(album.id, "down")} disabled={index === albums.length - 1} aria-label={`Move ${album.name} down`}>↓</button>
          <button type="button" onClick={() => onRename(album)} aria-label={`Rename ${album.name}`}>✎</button>
          <button type="button" onClick={() => onDelete(album)} aria-label={`Delete ${album.name}`}>×</button>
        </div>
      </div>)}
    </div>
    {!albums.length && <p className="drawer-note">Create an album when a memory wants its own page.</p>}
  </nav>;
}
