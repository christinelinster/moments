import { useState, type KeyboardEvent, type PointerEvent } from "react";
import type { StickerAsset, StickerPlacement } from "../api/types";

export function StickerCanvasLayer({ placements, assets, editable, onChange, onDelete }: { placements: StickerPlacement[]; assets: StickerAsset[]; editable: boolean; onChange: (placement: StickerPlacement) => void; onDelete: (placement: StickerPlacement) => void }) {
  const [dragPositions, setDragPositions] = useState<Record<string, { x: number; y: number }>>({});

  function dragStart(event: PointerEvent<HTMLDivElement>, placement: StickerPlacement) {
    if (!editable) return;
    const target = event.currentTarget;
    const rect = target.parentElement?.getBoundingClientRect();
    if (!rect || !rect.width || !rect.height) return;
    target.setPointerCapture(event.pointerId);
    let latest = dragPositions[placement.id] ?? { x: placement.x, y: placement.y };
    const pointFor = (moveEvent: globalThis.PointerEvent) => ({
      x: Math.min(100, Math.max(0, ((moveEvent.clientX - rect.left) / rect.width) * 100)),
      y: Math.min(100, Math.max(0, ((moveEvent.clientY - rect.top) / rect.height) * 100)),
    });
    const move = (moveEvent: globalThis.PointerEvent) => {
      latest = pointFor(moveEvent);
      setDragPositions((current) => ({ ...current, [placement.id]: latest }));
    };
    const end = () => {
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", end);
      target.removeEventListener("pointercancel", end);
      setDragPositions((current) => {
        const next = { ...current };
        delete next[placement.id];
        return next;
      });
      onChange({ ...placement, ...latest });
    };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", end);
    target.addEventListener("pointercancel", end);
  }

  function nudge(event: KeyboardEvent<HTMLDivElement>, placement: StickerPlacement) {
    if (!editable) return;
    const step = event.shiftKey ? 5 : 1;
    let x = placement.x;
    let y = placement.y;
    if (event.key === "ArrowLeft") x -= step;
    else if (event.key === "ArrowRight") x += step;
    else if (event.key === "ArrowUp") y -= step;
    else if (event.key === "ArrowDown") y += step;
    else return;
    event.preventDefault();
    onChange({ ...placement, x: Math.min(100, Math.max(0, x)), y: Math.min(100, Math.max(0, y)) });
  }

  return <div className="sticker-canvas-layer" aria-label="Sticker decorations">{placements.slice().sort((a, b) => a.layer - b.layer).map((placement) => { const asset = assets.find((candidate) => candidate.id === placement.stickerAssetId); if (!asset) return null; const position = dragPositions[placement.id] ?? placement; return <div className={`sticker-placement ${editable ? "editable" : ""}`} key={placement.id} style={{ left: `${position.x}%`, top: `${position.y}%`, zIndex: placement.layer, transform: `translate(-50%, -50%) scale(${placement.scale}) rotate(${placement.rotation}deg)` }} tabIndex={editable ? 0 : undefined} role={editable ? "group" : undefined} aria-label={editable ? `Sticker ${asset.originalName}` : undefined} onKeyDown={(event) => nudge(event, placement)} onPointerDown={(event) => { if (!(event.target as HTMLElement).closest("button")) dragStart(event, placement); }}><img src={asset.fileUrl} alt={asset.originalName} /><span className="sticker-controls" hidden={!editable}><button type="button" onClick={(event) => { event.stopPropagation(); onChange({ ...placement, layer: placement.layer + 1 }); }} aria-label={`Bring sticker ${asset.originalName} forward`}>↑</button><button type="button" onClick={(event) => { event.stopPropagation(); onChange({ ...placement, layer: Math.max(0, placement.layer - 1) }); }} aria-label={`Send sticker ${asset.originalName} backward`}>↓</button><button type="button" onClick={(event) => { event.stopPropagation(); onChange({ ...placement, scale: Math.min(4, placement.scale + .1) }); }} aria-label={`Enlarge sticker ${asset.originalName}`}>＋</button><button type="button" onClick={(event) => { event.stopPropagation(); onChange({ ...placement, scale: Math.max(.1, placement.scale - .1) }); }} aria-label={`Shrink sticker ${asset.originalName}`}>−</button><button type="button" onClick={(event) => { event.stopPropagation(); onChange({ ...placement, rotation: Math.max(-180, placement.rotation - 15) }); }} aria-label={`Rotate sticker ${asset.originalName} left`}>↺</button><button type="button" onClick={(event) => { event.stopPropagation(); onChange({ ...placement, rotation: Math.min(180, placement.rotation + 15) }); }} aria-label={`Rotate sticker ${asset.originalName} right`}>↻</button><button type="button" onClick={(event) => { event.stopPropagation(); onDelete(placement); }} aria-label={`Delete sticker ${asset.originalName}`}>×</button></span></div>; })}</div>;
}
