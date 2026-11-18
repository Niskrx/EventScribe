export function ErrorState({
  title = "Something went wrong",
  description,
}: {
  title?: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-5 shadow-2xs" role="alert">
      <div className="flex items-start gap-3.5">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-200 font-bold text-rose-800 text-xs">
          !
        </span>
        <div>
          <h3 className="font-bold text-sm text-rose-900">{title}</h3>
          <p className="mt-1 text-xs text-rose-700 leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  );
}
