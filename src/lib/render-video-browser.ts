import {
  GitHubStarsComposition,
  animationDurationInSeconds,
  fps,
  height,
  width,
} from "@/video/composition";
import { defaultProps, type Props } from "@/video/schema";
import {
  canRenderMediaOnWeb,
  renderMediaOnWeb,
  type RenderMediaOnWebProgress,
} from "@remotion/web-renderer";

const COMPOSITION_ID = "GitHubStars";

export function isBrowserExportSupported(): boolean {
  // Synchronous coarse check; full codec probe is async via assertBrowserExportSupported.
  return (
    typeof window !== "undefined" &&
    typeof VideoEncoder !== "undefined" &&
    typeof VideoFrame !== "undefined"
  );
}

export async function assertBrowserExportSupported(): Promise<void> {
  if (!isBrowserExportSupported()) {
    throw new Error(
      "This browser cannot export MP4. Use Chrome 94+, Firefox 130+, or Safari 26+.",
    );
  }

  const result = await canRenderMediaOnWeb({
    container: "mp4",
    videoCodec: "h264",
    width,
    height,
    muted: true,
  });

  if (!result.canRender) {
    const detail = result.issues
      .filter((i) => i.severity === "error")
      .map((i) => i.message)
      .join(" ");
    throw new Error(
      detail ||
        "This browser cannot encode MP4 (WebCodecs). Try Chrome or a recent Firefox/Safari.",
    );
  }
}

export async function renderVideoInBrowser(
  inputProps: Partial<Props>,
  options?: {
    onProgress?: (progress: RenderMediaOnWebProgress) => void;
    signal?: AbortSignal;
  },
): Promise<Blob> {
  await assertBrowserExportSupported();

  const props: Props = { ...defaultProps, ...inputProps };

  const { getBlob } = await renderMediaOnWeb({
    composition: {
      id: COMPOSITION_ID,
      component: GitHubStarsComposition,
      durationInFrames: (animationDurationInSeconds + 1) * fps,
      fps,
      width,
      height,
      defaultProps,
    },
    inputProps: props,
    container: "mp4",
    videoCodec: "h264",
    // Composition has no audio track.
    muted: true,
    // Tailwind / layout-heavy UI — full screenshot path is more reliable than CSS emulation.
    allowHtmlInCanvas: true,
    pageResponsiveness: "medium",
    onProgress: options?.onProgress,
    signal: options?.signal,
  });

  return getBlob();
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    // Delay revoke so the browser can start the download.
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
}
