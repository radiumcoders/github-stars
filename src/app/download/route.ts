import { getLocalRenderOutputPath } from "@/lib/render-video-local";
import { env } from "@/lib/env";
import { getRenderProgress } from "@remotion/lambda/client";
import fs from "fs/promises";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const user = searchParams.get("user") ?? "user";
  const repository = searchParams.get("repository") ?? "repo";
  const mode = searchParams.get("mode") ?? "lambda";
  const filename = `${user}-${repository}.mp4`;

  if (mode === "local") {
    const fileId = searchParams.get("fileId");
    if (!fileId) {
      return NextResponse.json({ error: "Missing fileId" }, { status: 400 });
    }

    const filePath = getLocalRenderOutputPath(fileId);
    try {
      const buffer = await fs.readFile(filePath);
      return new NextResponse(buffer, {
        headers: {
          "content-type": "video/mp4",
          "content-disposition": `attachment; filename="${filename}"`,
        },
      });
    } catch {
      return NextResponse.json({ error: "Video file not found" }, { status: 404 });
    }
  }

  if (!env.hasLambda) {
    return NextResponse.json({ error: "Remotion Lambda not configured" }, { status: 503 });
  }

  const renderId = String(searchParams.get("renderId"));
  const bucketName = String(searchParams.get("bucketName"));

  const { outputFile } = await getRenderProgress({
    region: env.REMOTION_AWS_REGION as "us-east-1",
    functionName: env.REMOTION_AWS_FUNCTION_NAME!,
    renderId,
    bucketName,
  });

  if (!outputFile) throw new Error("Video is not ready for download");

  const response = await fetch(outputFile);

  return new NextResponse(response.body, {
    headers: {
      ...response.headers,
      "content-disposition": `attachment; filename="${filename}"`,
    },
  });
}