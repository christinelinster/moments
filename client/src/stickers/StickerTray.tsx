import { useRef, useState, type ChangeEvent } from "react";
import type { StickerAsset } from "../api/types";
import { Button } from "../components/Button";

export function StickerTray({ assets, onUpload, onChoose }: { assets: StickerAsset[]; onUpload: (file: File) => Promise<void>; onChoose: (asset: StickerAsset) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  async function chooseFile(event: ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; event.target.value = ""; if (!file) return; setBusy(true); try { await onUpload(file); } finally { setBusy(false); } }
  return <section className="sticker-tray" aria-label="Sticker tray"><div className="sticker-tray-heading"><div><p className="eyebrow">Little marks</p><h2>Stickers</h2></div><Button type="button" className="button-small" onClick={() => inputRef.current?.click()} disabled={busy} aria-label="Upload sticker">+</Button><input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => void chooseFile(event)} hidden /></div>{assets.length ? <div className="sticker-list">{assets.map((asset) => <button type="button" className="sticker-chip" key={asset.id} onClick={() => onChoose(asset)} aria-label={`Place ${asset.originalName}`}><img src={asset.fileUrl} alt={asset.originalName} /><span>{asset.originalName}</span></button>)}</div> : <p className="drawer-note">Upload a PNG, JPEG, or WebP to make a mark of your own.</p>}</section>;
}
