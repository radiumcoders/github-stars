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
  const blankFrames = createBlankFrameDetector();

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
    // Keep this off. It opts into Chromium's experimental HTML-in-canvas
    // capture (drawElementImage), which takes over as soon as a browser exposes
    // the API and can hand back empty frames without throwing — the MP4 then
    // encodes as solid black. The built-in DOM composer renders every preset.
    allowHtmlInCanvas: false,
    pageResponsiveness: "medium",
    onFrame: blankFrames.inspect,
    onProgress: options?.onProgress,
    signal: options?.signal,
  });

  if (blankFrames.allBlank()) {
    throw new Error(
      "The export came out empty, so nothing was downloaded. Reload the page and try again, or use the latest Chrome.",
    );
  }

  return getBlob();
}

// How often a rendered frame is checked, and the size it is checked at.
const BLANK_CHECK_EVERY_N_FRAMES = 30;
const BLANK_CHECK_SIZE = 16;

/**
 * Watches rendered frames for the "nothing was captured" failure, where every
 * pixel is fully transparent (H.264 has no alpha, so that plays back as black).
 * Every preset paints an opaque background, so a real frame always has alpha.
 */
function createBlankFrameDetector() {
  const canvas = new OffscreenCanvas(BLANK_CHECK_SIZE, BLANK_CHECK_SIZE);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  let seen = 0;
  let checked = 0;
  let blank = 0;

  return {
    inspect(frame: VideoFrame): VideoFrame {
      if (ctx && seen++ % BLANK_CHECK_EVERY_N_FRAMES === 0) {
        ctx.clearRect(0, 0, BLANK_CHECK_SIZE, BLANK_CHECK_SIZE);
        ctx.drawImage(frame, 0, 0, BLANK_CHECK_SIZE, BLANK_CHECK_SIZE);
        const { data } = ctx.getImageData(
          0,
          0,
          BLANK_CHECK_SIZE,
          BLANK_CHECK_SIZE,
        );
        let hasPixels = false;
        for (let i = 3; i < data.length; i += 4) {
          if (data[i] !== 0) {
            hasPixels = true;
            break;
          }
        }
        checked++;
        if (!hasPixels) blank++;
      }
      return frame;
    },
    allBlank: () => checked > 0 && blank === checked,
  };
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
