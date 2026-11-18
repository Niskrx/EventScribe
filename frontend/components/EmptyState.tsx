export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--border)] bg-slate-50 p-5">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{description}</p>
    </div>
  );
}
