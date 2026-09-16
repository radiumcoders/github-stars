"use client";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { ExportConfig } from "@/lib/export-config";
import {
  downloadBlob,
  renderVideoInBrowser,
} from "@/lib/render-video-browser";
import { Props } from "@/video/schema";
import { Download, FileVideo } from "lucide-react";
import { useRef, useState } from "react";

type State =
  | { type: "initial" }
  | { type: "pending"; progress: number }
  | { type: "done"; blob: Blob }
  | { type: "error"; message: string };

function safeFilename(user: string, repository: string) {
  const clean = (value: string) =>
    value.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 64) || "repo";
  return `${clean(user)}-${clean(repository)}.mp4`;
}

export function GenerateButton({
  inputProps,
  exportConfig,
}: {
  inputProps?: Partial<Props>;
  exportConfig: ExportConfig;
}) {
  const [state, setState] = useState<State>({ type: "initial" });
  const abortRef = useRef<AbortController | null>(null);

  const filename = safeFilename(
    inputProps?.user ?? "user",
    inputProps?.repository ?? "repo",
  );

  if (inputProps && state.type === "done") {
    return (
      <div className="flex w-full flex-col gap-2">
        <Button
          type="button"
          className="w-full"
          onClick={() => downloadBlob(state.blob, filename)}
        >
          <Download data-icon="inline-start" />
          Download video
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Rendered on your device. Re-download anytime without re-rendering.
        </p>
      </div>
    );
  }

  const isLoading = state.type === "pending";
  const progressPct =
    state.type === "pending" ? Math.round(state.progress * 100) : 0;

  return (
    <div className="flex w-full flex-col gap-2">
      <Button
        className="w-full"
        onClick={async () => {
          if (!inputProps) return;

          abortRef.current?.abort();
          const controller = new AbortController();
          abortRef.current = controller;

          try {
            setState({ type: "pending", progress: 0 });

            const blob = await renderVideoInBrowser(inputProps, {
              signal: controller.signal,
              onProgress: ({ progress }) => {
                setState({ type: "pending", progress });
              },
            });

            setState({ type: "done", blob });
            downloadBlob(blob, filename);
          } catch (err) {
            if (controller.signal.aborted) {
              setState({ type: "initial" });
              return;
            }
            const message =
              err instanceof Error
                ? err.message
                : "Could not render video in this browser.";
            setState({ type: "error", message });
          }
        }}
        disabled={!inputProps || isLoading}
      >
        {isLoading ? (
          <>
            <Spinner data-icon="inline-start" />
            Rendering {progressPct}%
          </>
        ) : (
          <>
            <FileVideo data-icon="inline-start" />
            Download video
          </>
        )}
      </Button>

      {state.type === "error" ? (
        <p className="text-center text-xs text-destructive">{state.message}</p>
      ) : null}
      {isLoading ? (
        <p className="text-center text-xs text-muted-foreground">
          Encoding on your computer. Keep this tab open.
        </p>
      ) : null}
      {!isLoading && exportConfig.hint && state.type === "initial" ? (
        <p className="text-center text-xs text-muted-foreground">
          {exportConfig.hint}
        </p>
      ) : null}
    </div>
  );
}
