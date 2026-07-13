"use server";

import { getGithubOAuthToken } from "@/lib/github-access-token";
import { getGithubStarsInfo, type GithubStarsResult } from "@/lib/github-stars-info";
import { env } from "@/lib/env";
import type { GenerateVideoResult } from "@/lib/video-export";
import { defaultProps, schema } from "@/video/schema";
import { getRenderProgress, renderMediaOnLambda } from "@remotion/lambda/client";

export async function fetchGithubStars(repository: string): Promise<GithubStarsResult> {
  const token = await getGithubOAuthToken();
  if (!token) {
    return {
      ok: false,
      code: "missing_token",
      message:
        "Sign in with GitHub to authorize access before fetching stargazers.",
    };
  }
  return getGithubStarsInfo(repository, token);
}

export async function generateVideo(inputProps: unknown): Promise<GenerateVideoResult> {
  const props = schema.parse(
    typeof inputProps === "object" ? { ...defaultProps, ...inputProps } : {},
  );

  if (env.hasLambda) {
    const { renderId, bucketName } = await renderMediaOnLambda({
      region: env.REMOTION_AWS_REGION as "us-east-1",
      functionName: env.REMOTION_AWS_FUNCTION_NAME!,
      serveUrl: env.REMOTION_SERVE_URL!,
      composition: "GitHubStars",
      inputProps: props,
      codec: "h264",
    });
    return { mode: "lambda", renderId, bucketName };
  }

  if (env.isVercel) {
    throw new Error(
      "Remotion Lambda is not configured on Vercel. Set REMOTION_AWS_ACCESS_KEY_ID, REMOTION_AWS_SECRET_ACCESS_KEY, REMOTION_AWS_FUNCTION_NAME, and REMOTION_SERVE_URL in your Vercel project settings.",
    );
  }

  const { renderVideoLocal } = await import("@/lib/render-video-local");
  const fileId = await renderVideoLocal(props);
  return { mode: "local", fileId };
}

export async function getVideoGenerationProgress(renderId: string, bucketName: string) {
  if (!env.hasLambda) {
    throw new Error("Lambda progress is only available when Remotion Lambda is configured.");
  }

  const { done, errors, outputFile } = await getRenderProgress({
    region: env.REMOTION_AWS_REGION as "us-east-1",
    functionName: env.REMOTION_AWS_FUNCTION_NAME!,
    renderId,
    bucketName,
  });

  if (errors) {
    for (const error of errors) {
      console.error(error);
    }
  }

  return { done, error: errors.length > 0, outputFile };
}