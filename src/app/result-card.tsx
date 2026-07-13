import { GenerateButton } from "@/app/generate-button";
import { Card } from "@/components/ui/card";
import type { ExportConfig } from "@/lib/export-config";
import { cn } from "@/lib/utils";
import { Props } from "@/video/schema";
import { ReactNode } from "react";

export function ResultCard({
  children,
  className,
  inputProps,
  exportConfig,
}: {
  children?: ReactNode;
  className?: string;
  inputProps?: Partial<Props>;
  exportConfig: ExportConfig;
}) {
  return (
    <div className="flex w-full max-w-2xl flex-col gap-4">
      <div className="w-full">
        <div className="mb-2 flex items-center justify-between border-b border-border pb-2">
          <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            Preview
          </span>
          {inputProps && (
            <span className="font-mono text-[11px] text-muted-foreground">
              {inputProps.user}/{inputProps.repository}
            </span>
          )}
        </div>
        <div className="border border-border bg-background p-[1px]">
          <Card
            className={cn(
              className,
              "aspect-video size-full overflow-hidden border-0 bg-white text-black",
            )}
          >
            {children}
          </Card>
        </div>
      </div>
      {inputProps && <GenerateButton inputProps={inputProps} exportConfig={exportConfig} />}
    </div>
  );
}