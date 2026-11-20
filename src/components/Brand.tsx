export function Brand({ compact = false }: { compact?: boolean }) {
  return <span className={`brand ${compact ? 'brand-compact' : ''}`}><span className="brand-mark" aria-hidden="true"><svg viewBox="0 0 40 40"><path d="M5 8h9l6 16 6-16h9L23 33h-6Z" fill="currentColor" /><path d="m28 27 7-14v16l-7 6Z" fill="currentColor" opacity=".45" /></svg></span>{!compact && <span className="brand-word">VLAD<span>GELIK</span><small>ИСКУССТВО УЛУЧШЕНИЯ</small></span>}</span>;
}
