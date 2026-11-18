export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-white p-5 text-sm text-[var(--muted)]" role="status">
      {label}…
    </div>
  );
}
