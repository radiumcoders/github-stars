import { ExternalLink } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-white/8 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 text-center sm:flex-row sm:justify-between sm:text-left">
        <p className="text-sm text-muted-foreground">
          Data refreshed daily via GitHub Actions
        </p>
        <Separator className="hidden bg-white/8 sm:block sm:h-4 sm:w-px" orientation="vertical" />
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-violet-300"
        >
          <ExternalLink className="size-4" />
          View on GitHub
        </a>
      </div>
    </footer>
  );
}