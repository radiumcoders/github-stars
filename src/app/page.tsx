import { StarsViewer } from "@/app/stars-viewer";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ repository?: string }>;
}) {
  const { repository = "" } = await searchParams;

  return (
    <main className="flex flex-1 flex-col items-center justify-center p-4">
      <StarsViewer initialRepository={repository} />
    </main>
  );
}