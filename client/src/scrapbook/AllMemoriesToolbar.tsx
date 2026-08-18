import { useState } from "react";
import type { Album } from "../api/types";
import { Button } from "../components/Button";

export function AllMemoriesToolbar({ selectedCount, albums, onMove, onDelete, onClear }: { selectedCount: number; albums: Album[]; onMove: (albumId: string | null) => void; onDelete: () => void; onClear: () => void }) {
  const [destination, setDestination] = useState<string | null | undefined>(undefined);
  if (!selectedCount) return null;
  const selectValue = destination === undefined ? "__choose__" : destination ?? "__all__";
  function clearSelection() {
    setDestination(undefined);
    onClear();
  }
  function confirmMove() {
    if (destination === undefined) return;
    onMove(destination);
    setDestination(undefined);
  }
  return <div className="bulk-toolbar" role="toolbar" aria-label="Bulk memory actions"><strong>{selectedCount} selected</strong><label>Move to <select value={selectValue} onChange={(event) => { if (event.target.value !== "__choose__") setDestination(event.target.value === "__all__" ? null : event.target.value); }}><option value="__choose__" disabled>Choose album</option><option value="__all__">All memories</option>{albums.map((album) => <option key={album.id} value={album.id}>{album.name}</option>)}</select></label>{destination !== undefined && <Button className="button-primary" type="button" onClick={confirmMove}>Move selected</Button>}<Button className="button-danger" type="button" onClick={onDelete}>Delete selected</Button><button type="button" onClick={clearSelection}>Clear</button></div>;
}
