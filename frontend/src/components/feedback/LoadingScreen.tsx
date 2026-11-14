export function LoadingScreen({ label = 'Loading your workspace' }: { label?: string }) {
  return (
    <main className="loading-screen" aria-busy="true" aria-live="polite">
      <span className="loading-mark" aria-hidden="true">
        U
      </span>
      <span>{label}</span>
    </main>
  );
}
