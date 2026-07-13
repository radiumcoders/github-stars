import { env } from "@/lib/env";
import { getLocalRenderOutputPath } from "@/lib/local-render-paths";
import { getRenderProgress } from "@remotion/lambda/client";
import fs from "fs/promises";
import { NextResponse } from "next/server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function safeFilename(user: string, repository: string) {
  const clean = (value: string) =>
    value.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 64) || "repo";
  return `${clean(user)}-${clean(repository)}.mp4`;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const user = searchParams.get("user") ?? "user";
  const repository = searchParams.get("repository") ?? "repo";
  const mode = searchParams.get("mode") ?? "lambda";
  const filename = safeFilename(user, repository);

  if (mode === "local") {
    // Local FFmpeg render is only available off Vercel.
    if (env.isVercel) {
      return NextResponse.json(
        { error: "Local download is not available on Vercel." },
        { status: 400 },
      );
    }

    const fileId = searchParams.get("fileId");
    if (!fileId || !UUID_RE.test(fileId)) {
      return NextResponse.json({ error: "Invalid or missing fileId" }, { status: 400 });
    }

    const filePath = getLocalRenderOutputPath(fileId);
    try {
      const buffer = await fs.readFile(filePath);
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "video/mp4",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Content-Length": String(buffer.byteLength),
          "Cache-Control": "no-store",
        },
      });
    } catch {
      return NextResponse.json({ error: "Video file not found" }, { status: 404 });
    }
  }

  if (!env.hasLambda) {
    return NextResponse.json(
      { error: "Remotion Lambda not configured" },
      { status: 503 },
    );
  }

  const renderId = searchParams.get("renderId");
  const bucketName = searchParams.get("bucketName");

  if (!renderId || !bucketName) {
    return NextResponse.json(
      { error: "Missing renderId or bucketName" },
      { status: 400 },
    );
  }

  try {
    const { outputFile } = await getRenderProgress({
      region: env.REMOTION_AWS_REGION as "us-east-1",
      functionName: env.REMOTION_AWS_FUNCTION_NAME!,
      renderId,
      bucketName,
    });

    if (!outputFile) {
      return NextResponse.json(
        { error: "Video is not ready for download" },
        { status: 404 },
      );
    }

    const response = await fetch(outputFile);

    if (!response.ok || !response.body) {
      return NextResponse.json(
        { error: "Failed to fetch rendered video" },
        { status: 502 },
      );
    }

    return new NextResponse(response.body, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[download] Lambda download failed:", err);
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }
}
