import { useEffect, useState } from "react";
import { Button } from "../components/Button";
import { disableShareLink, enableShareLink, getShareLink, rotateShareLink } from "./collaborator-api";

export function ShareLinkPanel({ scrapbookId, canManage, onClose }: { scrapbookId: string; canManage: boolean; onClose: () => void }) {
  const [link, setLink] = useState<{ shareToken: string; enabled: boolean } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => { if (canManage) void getShareLink(scrapbookId).then(setLink).catch(() => setMessage("Share link unavailable")); }, [canManage, scrapbookId]);
  if (!canManage) return null;
  const url = link ? `${window.location.origin}/shared/${encodeURIComponent(link.shareToken)}` : "";
  async function copy() { if (!url) return; await navigator.clipboard?.writeText(url); setMessage("Link copied"); }
  async function run(action: () => Promise<{ shareToken: string; enabled: boolean }>, success: string) { setLink(await action()); setMessage(success); }
  return <section className="share-panel" aria-labelledby="share-title"><div className="side-panel-header"><div><p className="eyebrow">A door for guests</p><h2 id="share-title">Public link</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="Close public link">×</button></div>{link ? <><label>Share URL<input readOnly value={url} /></label><div className="share-actions"><Button onClick={() => void copy()}>Copy link</Button><Button onClick={() => void run(() => rotateShareLink(scrapbookId), "Link rotated")}>Rotate</Button>{link.enabled ? <Button className="button-danger" onClick={() => void run(() => disableShareLink(scrapbookId), "Link disabled")}>Disable</Button> : <Button className="button-primary" onClick={() => void run(() => enableShareLink(scrapbookId), "Link enabled")}>Enable</Button>}</div></> : <p>{message ?? "Loading link..."}</p>}{message && <p className="panel-message" role="status">{message}</p>}</section>;
}
