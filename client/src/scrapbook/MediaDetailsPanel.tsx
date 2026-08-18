import { useEffect, useState } from "react";
import type { MediaItem } from "../api/types";
import { Button } from "../components/Button";

export function MediaDetailsPanel({ media, onClose, onSave }: { media: MediaItem | null; onClose: () => void; onSave: (updates: { caption: string | null; location: string | null }) => Promise<void> }) {
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCaption(media?.caption ?? "");
    setLocation(media?.location ?? "");
  }, [media]);

  if (!media) return <aside className="details-panel" aria-label="Media details"><div className="details-empty"><span aria-hidden="true">⌁</span><h2>Choose a memory</h2><p>Captions and places belong here, beside the paper.</p></div></aside>;

  async function save() {
    setSaving(true);
    try { await onSave({ caption: caption.trim() || null, location: location.trim() || null }); } finally { setSaving(false); }
  }

  return <aside className="details-panel" aria-label="Media details">
    <div className="details-header"><div><p className="eyebrow">A closer look</p><h2>Details</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="Close details">×</button></div>
    <div className="details-preview">{media.mediaType === "video" ? <video src={media.fileUrl} controls aria-label={media.originalName} /> : <img src={media.fileUrl} alt={media.originalName} />}</div>
    <p className="details-filename">{media.originalName}</p>
    <label>Caption<textarea value={caption} onChange={(event) => setCaption(event.target.value)} maxLength={2000} placeholder="What should this page remember?" /></label>
    <label>Location<input value={location} onChange={(event) => setLocation(event.target.value)} maxLength={500} placeholder="A place, a street, a feeling" /></label>
    <Button className="button-primary" type="button" onClick={() => void save()} disabled={saving}>{saving ? "Saving..." : "Save details"}</Button>
  </aside>;
}
