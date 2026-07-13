import type { Props } from "@/video/schema";
import {
  getLocalRenderOutputPath,
  getLocalRenderPropsPath,
} from "@/lib/local-render-paths";
import { randomUUID } from "crypto";
import { execFile } from "child_process";
import fs from "fs/promises";
import path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const COMPOSITION_ID = "GitHubStars";
const ENTRY_POINT = path.join("src", "video", "index.ts");

export { getLocalRenderOutputPath } from "@/lib/local-render-paths";

export async function renderVideoLocal(inputProps: Props): Promise<string> {
  const outDir = path.join(process.cwd(), ".remotion", "out");
  await fs.mkdir(outDir, { recursive: true });

  const fileId = randomUUID();
  const outputPath = getLocalRenderOutputPath(fileId);
  const propsPath = getLocalRenderPropsPath(fileId);

  await fs.writeFile(propsPath, JSON.stringify(inputProps), "utf8");

  const npx = process.platform === "win32" ? "npx.cmd" : "npx";

  try {
    await execFileAsync(
      npx,
      [
        "remotion",
        "render",
        ENTRY_POINT,
        COMPOSITION_ID,
        outputPath,
        `--props=${propsPath}`,
      ],
      {
        cwd: process.cwd(),
        maxBuffer: 10 * 1024 * 1024,
        env: process.env,
      },
    );
  } catch (err) {
    const stderr =
      err && typeof err === "object" && "stderr" in err
        ? String((err as { stderr: string }).stderr)
        : "";
    const message =
      stderr.includes("ffmpeg") || stderr.includes("FFmpeg")
        ? "FFmpeg is required for local export. Install it and add to PATH."
        : stderr.trim() || (err instanceof Error ? err.message : "Local render failed.");
    throw new Error(message);
  } finally {
    await fs.unlink(propsPath).catch(() => undefined);
  }

  return fileId;
}