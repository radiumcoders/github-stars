"use client";

import { generateVideo, getVideoGenerationProgress } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { delay } from "@/lib/utils";
import type { ExportConfig } from "@/lib/export-config";
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
      <p className="max-w-md text-center text-sm text-muted-foreground">
        {exportConfig.hint}
      </p>
    );
  }

  if (inputProps && state.type === "done") {
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

    return (
      <form action={`/download?${params.toString()}`} method="GET">
        <Button type="submit">
          <Download className="mr-2 size-4" /> Download video
        </Button>
      </form>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        onClick={async () => {
          try {
            if (!inputProps) return;

            setState({ type: "pending" });
            const result = await generateVideo(inputProps);

            if (result.mode === "local") {
              setState({ type: "done", mode: "local", fileId: result.fileId });
              return;
            }

            setState({
              type: "started",
              renderId: result.renderId,
              bucketName: result.bucketName,
            });

            do {
              await delay(5000);
              const progress = await getVideoGenerationProgress(
                result.renderId,
                result.bucketName,
              );
              if (progress.done) {
                setState({
                  type: "done",
                  mode: "lambda",
                  renderId: result.renderId,
                  bucketName: result.bucketName,
                });
                break;
              }
              if (progress.error) {
                setState({ type: "error", message: "Lambda render failed." });
                break;
              }
            } while (true);
          } catch (err) {
            const message =
              err instanceof Error
                ? err.message.includes("ffmpeg") || err.message.includes("FFmpeg")
                  ? "FFmpeg is required for local export. Install it and add to PATH."
                  : err.message
                : "Export failed.";
            setState({ type: "error", message });
          }
        }}
        disabled={!inputProps || state.type === "pending" || state.type === "started"}
      >
        {state.type === "pending" || state.type === "started" ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" /> Generating video…
          </>
        ) : (
          <>
            <FileVideo className="mr-2 size-4" /> Export MP4 video
          </>
        )}
      </Button>
      {exportConfig.hint && state.type === "initial" && (
        <p className="max-w-sm text-center text-xs text-muted-foreground">
          {exportConfig.hint}
        </p>
      )}
      {state.type === "pending" && exportConfig.mode === "local" && (
        <p className="max-w-sm text-center text-xs text-muted-foreground">
          Rendering locally — first run may take a minute while Remotion bundles.
        </p>
      )}
      {state.type === "pending" && exportConfig.mode === "lambda" && (
        <p className="max-w-sm text-center text-xs text-muted-foreground">
          Rendering on AWS Lambda — this usually takes 30–90 seconds.
        </p>
      )}
      {state.type === "error" && (
        <p className="max-w-sm text-center text-sm text-destructive">{state.message}</p>
      )}
    </div>
  );
}