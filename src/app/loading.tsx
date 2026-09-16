import { StarLogo } from "@/components/star-logo";
import { Spinner } from "@/components/ui/spinner";

export default function Loading() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-24 text-sm text-muted-foreground">
      <StarLogo className="size-8 text-foreground" />
      <div className="flex items-center gap-2">
        <Spinner className="size-3.5" />
        Loading
      </div>
    </div>
  );
}
