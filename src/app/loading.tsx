import { Spinner } from "@/components/ui/spinner";

export default function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
      <Spinner className="size-3.5" />
      Loading
    </div>
  );
}
