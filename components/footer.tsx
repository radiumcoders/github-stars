import { ExternalLink } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border py-8">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-4 text-center sm:flex-row sm:justify-between sm:text-left">
        <p className="font-mono text-xs text-muted-foreground">
          Data refreshed daily via GitHub Actions
        </p>
        <Separator className="hidden sm:block sm:h-4 sm:w-px" orientation="vertical" />
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ExternalLink className="size-3.5" />
          View on GitHub
        </a>
      </div>
    </footer>
  );
}