"use client";

import { generateVideo, getVideoGenerationProgress } from "@/app/actions";
import { Button } from "@/components/ui/button";
import type { ExportConfig } from "@/lib/export-config";
import { delay } from "@/lib/utils";
import { Props } from "@/video/schema";
import { Download, FileVideo, Loader2 } from "lucide-react";
import { useState } from "react";

type State =
  | { type: "initial" }
  | { type: "pending" }
  | { type: "started"; renderId: string; bucketName: string }
  | { type: "done"; mode: "lambda"; renderId: string; bucketName: string }
  | { type: "done"; mode: "local"; fileId: string }
  | { type: "error"; message: string };

function buildDownloadPath(
  inputProps: Partial<Props>,
  state: Extract<State, { type: "done" }>,
): string {
  const params = new URLSearchParams({
    user: inputProps.user ?? "user",
    repository: inputProps.repository ?? "repo",
    mode: state.mode,
  });

  if (state.mode === "lambda") {
    params.set("renderId", state.renderId);
    params.set("bucketName", state.bucketName);
  } else {
    params.set("fileId", state.fileId);
  }

  return `/download?${params.toString()}`;
}

/** Full-page navigation so the browser handles Content-Disposition (SPA router breaks binary downloads). */
function triggerDownload(path: string) {
  window.location.assign(path);
}

export function GenerateButton({
  inputProps,
  exportConfig,
}: {
  inputProps?: Partial<Props>;
  exportConfig: ExportConfig;
}) {
  const [state, setState] = useState<State>({ type: "initial" });

  if (exportConfig.mode === "disabled") {
    return (
      <p className="text-center font-mono text-[11px] leading-relaxed text-muted-foreground">
        {exportConfig.hint}
      </p>
    );
  }

  if (inputProps && state.type === "done") {
    return (
      <Button
        type="button"
        className="w-full font-mono text-xs uppercase tracking-wider"
        onClick={() => triggerDownload(buildDownloadPath(inputProps, state))}
      >
        <Download data-icon="inline-start" />
        Download video
      </Button>
    );
  }

  const isLoading = state.type === "pending" || state.type === "started";

  return (
    <div className="flex w-full flex-col gap-2">
      <Button
        className="w-full font-mono text-xs uppercase tracking-wider"
        onClick={async () => {
          try {
            if (!inputProps) return;

            setState({ type: "pending" });
            const result = await generateVideo(inputProps);

            if (result.mode === "local") {
              const doneState = {
                type: "done" as const,
                mode: "local" as const,
                fileId: result.fileId,
              };
              setState(doneState);
              triggerDownload(buildDownloadPath(inputProps, doneState));
              return;
            }

            setState({
              type: "started",
              renderId: result.renderId,
              bucketName: result.bucketName,
            });

            for (;;) {
              await delay(5000);
              const progress = await getVideoGenerationProgress(
                result.renderId,
                result.bucketName,
              );
              if (progress.done) {
                const doneState = {
                  type: "done" as const,
                  mode: "lambda" as const,
                  renderId: result.renderId,
                  bucketName: result.bucketName,
                };
                setState(doneState);
                triggerDownload(buildDownloadPath(inputProps, doneState));
                break;
              }
              if (progress.error) {
                setState({ type: "error", message: "Video render failed." });
                break;
              }
            }
          } catch (err) {
            const message =
              err instanceof Error
                ? err.message.includes("ffmpeg") || err.message.includes("FFmpeg")
                  ? "FFmpeg is required for local export. Install it and add to PATH."
                  : err.message
                : "Download failed.";
            setState({ type: "error", message });
          }
        }}
        disabled={!inputProps || isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 data-icon="inline-start" className="animate-spin" />
            Generating video…
          </>
        ) : (
          <>
            <FileVideo data-icon="inline-start" />
            Download video
          </>
        )}
      </Button>

      {state.type === "error" && (
        <p className="text-center font-mono text-[11px] text-destructive">
          {state.message}
        </p>
      )}
      {isLoading && exportConfig.mode === "lambda" && (
        <p className="text-center font-mono text-[10px] text-muted-foreground">
          Rendering on AWS — 30–90s typical.
        </p>
      )}
      {isLoading && exportConfig.mode === "local" && (
        <p className="text-center font-mono text-[10px] text-muted-foreground">
          Bundling Remotion — first run may take a minute.
        </p>
      )}
    </div>
  );
}
