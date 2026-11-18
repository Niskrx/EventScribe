export function ErrorState({
  title = "Something went wrong",
  description,
}: {
  title?: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-5" role="alert">
      <h3 className="font-semibold text-red-900">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-red-800">{description}</p>
    </div>
  );
}
