import { useRef, useState, type DragEvent, type ChangeEvent } from "react";
import { Button } from "../components/Button";
import { ApiError } from "../api/http";
import type { MediaItem } from "../api/types";
import { uploadMedia } from "./scrapbook-api";

const SUPPORTED_MEDIA_MIME_TYPES = new Set([
  "image/gif",
  "image/jpg",
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/ogg",
  "video/quicktime",
  "video/webm",
]);

const SUPPORTED_MEDIA_EXTENSIONS = /\.(gif|jpe?g|png|webp|mp4|og[g]?|mov|webm)$/i;

function isSupportedMediaFile(file: File): boolean {
  return SUPPORTED_MEDIA_MIME_TYPES.has(file.type.toLowerCase()) ||
    SUPPORTED_MEDIA_EXTENSIONS.test(file.name);
}

export function UploadDropzone({ scrapbookId, albumId, onUploaded, onError }: { scrapbookId: string; albumId: string | null; onUploaded: (media: MediaItem[]) => void; onError: (message: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  async function upload(files: FileList | File[]) {
    const requested = Array.from(files);
    const selected = requested.filter(isSupportedMediaFile);
    const unsupported = requested.filter((file) => !isSupportedMediaFile(file));
    if (!selected.length) {
      onError("Choose a JPG, PNG, GIF, WebP, MP4, MOV, OGG, or WebM file to upload.");
      return;
    }
    setBusy(true);
    try {
      const uploaded: MediaItem[] = [];
      const failures = unsupported.map((file) => `${file.name} is not a supported photo or video.`);
      for (const file of selected) {
        try {
          uploaded.push((await uploadMedia(scrapbookId, file, albumId)).media);
        } catch (error) {
          if (error instanceof ApiError && error.code === "DUPLICATE_MEDIA") {
            failures.push(`${file.name} is already in this scrapbook.`);
          } else {
            const message = error instanceof Error ? error.message : "Upload failed.";
            failures.push(`${file.name}: ${message}`);
          }
        }
      }
      if (uploaded.length) onUploaded(uploaded);
      if (failures.length) onError(failures.join(" "));
    } finally { setBusy(false); }
  }

  function choose(event: ChangeEvent<HTMLInputElement>) { if (event.target.files) void upload(event.target.files); event.target.value = ""; }
  function drop(event: DragEvent<HTMLDivElement>) { event.preventDefault(); setDragging(false); void upload(event.dataTransfer.files); }

  return <div className={`upload-dropzone ${dragging ? "dragging" : ""}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={drop}>
    <span className="upload-icon" aria-hidden="true">↟</span>
    <div><strong>{busy ? "Adding your memories..." : "Drop photos or videos here"}</strong><p>{busy ? "Uploads are saved one by one." : "or choose a handful from your device"}</p></div>
    <Button type="button" className="button-outline" onClick={() => inputRef.current?.click()} disabled={busy}>{busy ? "Uploading" : "Choose files"}</Button>
    <input ref={inputRef} type="file" aria-label="Choose files" accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/ogg,video/webm,.jpeg,.jpg,.mov" multiple onChange={choose} hidden />
  </div>;
}
