export function EmptyState({ title = "No memories yet", description = "Add a photo or video to start this spread." }: { title?: string; description?: string }) {
  return <div className="empty-state"><span className="empty-scribble" aria-hidden="true">✳</span><h3>{title}</h3><p>{description}</p></div>;
}
