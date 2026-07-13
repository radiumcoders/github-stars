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
    <main className="flex flex-1 flex-col items-center justify-center p-4">
      <StarsViewer initialRepository={repository} exportConfig={exportConfig} />
    </main>
  );
}