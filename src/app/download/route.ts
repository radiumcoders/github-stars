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

  const renderId = searchParams.get("renderId");
  const bucketName = searchParams.get("bucketName");

  if (!renderId || !bucketName) {
    return NextResponse.json({ error: "Missing renderId or bucketName" }, { status: 400 });
  }

  try {
    const { outputFile } = await getRenderProgress({
      region: env.REMOTION_AWS_REGION as "us-east-1",
      functionName: env.REMOTION_AWS_FUNCTION_NAME!,
      renderId,
      bucketName,
    });

    if (!outputFile) {
      return NextResponse.json({ error: "Video is not ready for download" }, { status: 404 });
    }

    const response = await fetch(outputFile);

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch rendered video" }, { status: 502 });
    }

    return new NextResponse(response.body, {
      headers: {
        ...response.headers,
        "content-disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }
}