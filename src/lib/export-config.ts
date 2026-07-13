import { env } from "@/lib/env";

export type ExportMode = "lambda" | "local" | "disabled";

export interface ExportConfig {
  mode: ExportMode;
  hint: string | null;
}

export function getExportConfig(): ExportConfig {
  if (env.hasLambda) {
    return {
      mode: "lambda",
      hint: env.isVercel
        ? "MP4 export runs on Remotion Lambda (AWS)."
        : null,
    };
  }

  if (env.isVercel) {
    return {
      mode: "disabled",
      hint:
        "MP4 export on Vercel requires Remotion Lambda. Add REMOTION_AWS_* and REMOTION_SERVE_URL in Vercel → Settings → Environment Variables (see .env.example).",
    };
  }

  return {
    mode: "local",
    hint: "Rendering locally — requires FFmpeg installed.",
  };
}