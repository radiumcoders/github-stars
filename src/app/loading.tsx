import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center gap-2 py-24 font-mono text-xs text-muted-foreground">
      <Loader2 className="size-3.5 animate-spin" />
      Loading
    </div>
  );
}
