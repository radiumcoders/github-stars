export type ExportMode = "browser";

export interface ExportConfig {
  mode: ExportMode;
  hint: string | null;
}

/** MP4 export always runs in the user's browser — no AWS / FFmpeg server. */
export function getExportConfig(): ExportConfig {
  return {
    mode: "browser",
    hint: "Renders on your device — keep this tab open until the download starts.",
  };
}
