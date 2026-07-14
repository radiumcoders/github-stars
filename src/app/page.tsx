import { StarsViewer } from "@/app/stars-viewer";
import { getExportConfig } from "@/lib/export-config";
import { normalizeRepoName } from "@/lib/normalize-repo-name";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ repository?: string }>;
}) {
  const { repository = "" } = await searchParams;
  const initialRepository = normalizeRepoName(repository);
  const exportConfig = getExportConfig();

  return (
    <main className="flex flex-1 flex-col items-center px-4 py-12 sm:px-6 sm:py-16">
      <div className="mb-10 max-w-lg text-center sm:text-left">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          Remotion · GitHub API
        </p>
        <h1 className="mt-3 text-3xl font-medium tracking-tightest sm:text-4xl">
          Star history, animated.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Sign in with GitHub, enter one of your repositories, and watch stargazers slide in — export as MP4 right in your browser.
        </p>
      </div>
      <StarsViewer
        initialRepository={initialRepository}
        exportConfig={exportConfig}
      />
    </main>
  );
}