"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function AppError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("[app]", error.digest ?? error.name);
  }, [error]);

  return (
    <main id="main" className="mx-auto flex min-h-0 flex-1 flex-col justify-center gap-3 px-6 py-16">
      <h1 className="text-lg font-medium">This page could not load</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        A server error occurred. Reload to try again, or return home and continue from there.
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="text-sm font-medium underline underline-offset-2"
          onClick={() => unstable_retry()}
        >
          Reload
        </button>
        <Link className="text-sm font-medium underline underline-offset-2" href="/">
          Return to GitHub Stars
        </Link>
      </div>
    </main>
  );
}
