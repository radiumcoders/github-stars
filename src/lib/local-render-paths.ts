import path from "path";

export function getLocalRenderOutputPath(fileId: string): string {
  return path.join(process.cwd(), ".remotion", "out", `${fileId}.mp4`);
}

export function getLocalRenderPropsPath(fileId: string): string {
  return path.join(process.cwd(), ".remotion", "out", `${fileId}.json`);
}