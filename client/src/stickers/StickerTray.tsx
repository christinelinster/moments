import { useRef, useState, type ChangeEvent } from "react";
import type { StickerAsset } from "../api/types";
import { Button } from "../components/Button";
import { Modal } from "../components/Modal";

type StickerTrayProps = {
  assets: StickerAsset[];
  onUpload: (file: File) => Promise<void>;
  onChoose: (asset: StickerAsset) => void;
  onDelete: (asset: StickerAsset) => Promise<void>;
};

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function StickerTray({ assets, onUpload, onChoose, onDelete }: StickerTrayProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<StickerAsset | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    setUploadError(null);
    try {
      await onUpload(file);
    } catch (error) {
      setUploadError(errorMessage(error, "That sticker could not be uploaded. Try again."));
    } finally {
      setBusy(false);
    }
  }

  function requestDelete(asset: StickerAsset) {
    setDeleteError(null);
    setPendingDelete(asset);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await onDelete(pendingDelete);
      setPendingDelete(null);
    } catch (error) {
      setDeleteError(errorMessage(error, "That sticker could not be deleted. Try again."));
    } finally {
      setDeleteBusy(false);
    }
  }

  return <>
    <section className="sticker-tray" aria-label="Sticker tray">
      <div className="sticker-tray-heading">
        <div><p className="eyebrow">Little marks</p><h2>Stickers</h2></div>
        <Button type="button" className="button-small" onClick={() => inputRef.current?.click()} disabled={busy} aria-label="Upload sticker">+</Button>
        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => void chooseFile(event)} hidden />
      </div>
      {uploadError && <p className="form-error" role="alert">{uploadError}</p>}
      {assets.length ? <div className="sticker-list">{assets.map((asset) => <div className="sticker-chip" key={asset.id}>
        <button type="button" className="sticker-place" onClick={() => onChoose(asset)} aria-label={`Place ${asset.originalName}`}>
          <img src={asset.fileUrl} alt={asset.originalName} />
          <span>{asset.originalName}</span>
        </button>
        <button type="button" className="sticker-delete" onClick={() => requestDelete(asset)} aria-label={`Delete sticker ${asset.originalName}`}>×</button>
      </div>)}</div> : <p className="drawer-note">Upload a PNG, JPEG, or WebP to make a mark of your own.</p>}
    </section>
    {pendingDelete && <Modal title="Delete sticker?" onClose={() => { if (!deleteBusy) setPendingDelete(null); }}>
      <div className="modal-form">
        <p>Remove <strong>{pendingDelete.originalName}</strong> from this scrapbook? Existing placements will disappear too.</p>
        {deleteError && <p className="form-error" role="alert">{deleteError}</p>}
        <div className="modal-actions">
          <Button type="button" onClick={() => setPendingDelete(null)} disabled={deleteBusy}>Keep sticker</Button>
          <Button className="button-danger" type="button" onClick={() => void confirmDelete()} disabled={deleteBusy}>{deleteBusy ? "Deleting..." : "Delete sticker"}</Button>
        </div>
      </div>
    </Modal>}
  </>;
}
