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
    <>
      <div className="aspect-video w-full max-w-[640px] rounded-[0.6rem] dark:bg-gradient-to-b dark:from-slate-100 dark:p-[0.1rem]">
        <Card
          className={cn(
            className,
            "size-full overflow-hidden rounded-[0.5rem] bg-white text-black",
          )}
        >
          {children}
        </Card>
      </div>
      {inputProps && <GenerateButton inputProps={inputProps} exportConfig={exportConfig} />}
    </>
  );
}