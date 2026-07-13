import type { Props } from "@/video/schema";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { enableTailwind } from "@remotion/tailwind";
import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";

const COMPOSITION_ID = "GitHubStars";

let cachedBundleUrl: string | null = null;

async function getBundleUrl(): Promise<string> {
  if (!cachedBundleUrl) {
    cachedBundleUrl = await bundle({
      entryPoint: path.join(process.cwd(), "src", "video", "index.ts"),
      webpackOverride: enableTailwind,
    });
  }
  return cachedBundleUrl;
}

export function getLocalRenderOutputPath(fileId: string): string {
  return path.join(process.cwd(), ".remotion", "out", `${fileId}.mp4`);
}

export async function renderVideoLocal(inputProps: Props): Promise<string> {
  const serveUrl = await getBundleUrl();

  const composition = await selectComposition({
    serveUrl,
    id: COMPOSITION_ID,
    inputProps,
  });

  const outDir = path.join(process.cwd(), ".remotion", "out");
  await fs.mkdir(outDir, { recursive: true });

  const fileId = randomUUID();
  const outputPath = getLocalRenderOutputPath(fileId);

  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    outputLocation: outputPath,
    inputProps,
  });

  return fileId;
}