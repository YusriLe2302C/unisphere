import { Orbit } from 'lucide-react';

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <a className="brand" href="/" aria-label="UniSphere home">
      <span className="brand-mark">
        <Orbit size={19} strokeWidth={2.5} />
      </span>
      {!compact && (
        <span className="brand-copy">
          <span className="brand-wordmark">
            uni<span className="brand-accent">sphere</span>
          </span>
          <span className="brand-institution">RNS INSTITUTE OF TECHNOLOGY</span>
        </span>
      )}
    </a>
  );
}
