import { useRef } from "react";
import type { MediaItem } from "../api/types";

export type MediaCardProps = {
  media: MediaItem;
  selected: boolean;
  onSelect: (id: string, selected: boolean, shiftKey?: boolean) => void;
  onOpenDetails: (media: MediaItem) => void;
  onMove: (media: MediaItem) => void;
  onDelete: (media: MediaItem) => void;
  onMoveByKeyboard?: (media: MediaItem, direction: "up" | "down") => void;
};

export function MediaCard({ media, selected, onSelect, onOpenDetails, onMove, onDelete, onMoveByKeyboard, onDropReorder }: MediaCardProps & { onDropReorder?: (draggedId: string, targetId: string) => void }) {
  const label = media.caption || media.originalName;
  const shiftKeyRef = useRef(false);
  return <article className="media-card" draggable onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/media-id", media.id); }} onDragOver={(event) => { if (event.dataTransfer.types.includes("text/media-id")) { event.preventDefault(); event.dataTransfer.dropEffect = "move"; } }} onDrop={(event) => { event.preventDefault(); const draggedId = event.dataTransfer.getData("text/media-id"); if (draggedId && draggedId !== media.id) onDropReorder?.(draggedId, media.id); }}>
    <div className="media-card-image">
      {media.mediaType === "video" ? <video src={media.fileUrl} aria-label={media.originalName} muted preload="metadata" /> : <img src={media.fileUrl} alt={media.originalName} />}
      <label className="media-check"><input type="checkbox" checked={selected} onClick={(event) => { shiftKeyRef.current = event.shiftKey; }} onChange={(event) => { const shiftKey = shiftKeyRef.current || Boolean((event.nativeEvent as MouseEvent).shiftKey); shiftKeyRef.current = false; onSelect(media.id, event.target.checked, shiftKey); }} aria-label={`Select ${media.originalName}`} /><span aria-hidden="true" /></label>
      {media.mediaType === "video" && <span className="media-kind">Video</span>}
    </div>
    <div className="media-card-footer"><p>{label}</p><button type="button" onClick={() => onOpenDetails(media)} aria-label={`Edit details for ${media.originalName}`}>Details</button></div>
    <div className="media-card-actions">
      <button type="button" onClick={() => onMove(media)} aria-label={`Move ${media.originalName}`}>Move</button>
      <button type="button" onClick={() => onDelete(media)} aria-label={`Delete ${media.originalName}`}>Delete</button>
      {onMoveByKeyboard && <span className="sr-only">Use the move controls to reorder. </span>}
      {onMoveByKeyboard && <button type="button" onClick={() => onMoveByKeyboard(media, "up")} aria-label={`Move ${media.originalName} earlier`}>←</button>}
      {onMoveByKeyboard && <button type="button" onClick={() => onMoveByKeyboard(media, "down")} aria-label={`Move ${media.originalName} later`}>→</button>}
    </div>
  </article>;
}
