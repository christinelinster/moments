import { useState, type FormEvent } from "react";
import type { EditorMembership } from "../api/types";
import { Button } from "../components/Button";

export function CollaboratorPanel({ currentRole, members, onAdd, onRemove, onClose }: { currentRole: "owner" | "editor"; members: EditorMembership[]; onAdd: (email: string) => Promise<void>; onRemove: (membershipId: string) => Promise<void>; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function add(event: FormEvent) { event.preventDefault(); setBusy(true); setError(null); try { await onAdd(email.trim()); setEmail(""); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Could not add that editor."); } finally { setBusy(false); } }
  return <section className="side-panel" aria-labelledby="collaborator-title"><div className="side-panel-header"><div><p className="eyebrow">The people around the table</p><h2 id="collaborator-title">Collaborators</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="Close collaborators">×</button></div><p className="role-description">You are the <strong>{currentRole}</strong>. Editors can add editors; only the owner can remove one.</p><form className="inline-form" onSubmit={add}><label>Add an editor<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="friend@example.com" required /></label><Button className="button-primary" type="submit" disabled={busy}>{busy ? "Adding..." : "Add editor"}</Button></form>{error && <p className="form-error" role="alert">{error}</p>}<div className="member-list">{members.length ? members.map((member) => <div className="member-row" key={member.id}><div><strong>{member.email}</strong><span>{member.userId ? "Linked account" : "Pending account"}</span></div>{currentRole === "owner" && <button type="button" className="text-danger" onClick={() => void onRemove(member.id)} aria-label={`Remove ${member.email}`}>Remove</button>}</div>) : <p className="drawer-note">No invited editors yet.</p>}</div></section>;
}
