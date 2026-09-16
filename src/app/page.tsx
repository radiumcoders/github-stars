import { StarsViewer } from "@/app/stars-viewer";
import { getExportConfig } from "@/lib/export-config";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ repository?: string }>;
}) {
  const { repository = "" } = await searchParams;
  const exportConfig = getExportConfig();

  return (
    <main id="main" className="flex min-h-0 flex-1 flex-col">
      <StarsViewer initialRepository={repository} exportConfig={exportConfig} />
    </main>
  );
}
