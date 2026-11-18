"use client";

import { ErrorState } from "@/components/ErrorState";

export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <ErrorState description="The page could not be loaded. You can retry without losing your work." />
      <button
        type="button"
        onClick={() => reset()}
        className="mt-4 rounded-lg bg-[var(--brand)] px-4 py-2 font-semibold text-white"
      >
        Try again
      </button>
    </div>
  );
}
