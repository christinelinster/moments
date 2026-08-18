import type { MediaItem } from "../api/types";
import { EmptyState } from "../components/EmptyState";
import { MediaCard, type MediaCardProps } from "./MediaCard";

type Props = Omit<MediaCardProps, "media" | "selected" | "onSelect" | "onOpenDetails" | "onMove" | "onDelete"> & {
  media: MediaItem[];
  selectedIds: Set<string>;
  onSelect: (id: string, selected: boolean, shiftKey?: boolean) => void;
  onOpenDetails: (media: MediaItem) => void;
  onMove: (media: MediaItem) => void;
  onDelete: (media: MediaItem) => void;
  onReorder: (media: MediaItem, direction: "up" | "down") => void;
  onDropReorder?: (draggedId: string, targetId: string) => void;
};

export function MediaGrid({ media, selectedIds, onSelect, onOpenDetails, onMove, onDelete, onReorder, onDropReorder }: Props) {
  if (!media.length) return <EmptyState />;
  return <div className="media-grid" aria-label="Memories">
    {media.map((item) => <MediaCard key={item.id} media={item} selected={selectedIds.has(item.id)} onSelect={onSelect} onOpenDetails={onOpenDetails} onMove={onMove} onDelete={onDelete} onMoveByKeyboard={onReorder} onDropReorder={onDropReorder} />)}
  </div>;
}
