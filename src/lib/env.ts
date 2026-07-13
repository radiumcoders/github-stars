import { z } from "zod";

const envSchema = z.object({
  REMOTION_AWS_ACCESS_KEY_ID: z.string().optional(),
  REMOTION_AWS_SECRET_ACCESS_KEY: z.string().optional(),
  REMOTION_AWS_REGION: z.string().default("us-east-1"),
  REMOTION_AWS_FUNCTION_NAME: z.string().optional(),
  REMOTION_SERVE_URL: z.string().optional(),
  BETTER_AUTH_SECRET: z.string().optional(),
  BETTER_AUTH_URL: z.string().default("http://localhost:3000"),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  NEXT_PUBLIC_BASE_URL: z.string().default("http://localhost:3000"),
  VERCEL: z.string().optional(),
});

const parsed = envSchema.parse(process.env);

export const env = {
  ...parsed,
  isVercel: parsed.VERCEL === "1",
  hasLambda: Boolean(
    parsed.REMOTION_AWS_FUNCTION_NAME &&
      parsed.REMOTION_SERVE_URL &&
      parsed.REMOTION_AWS_ACCESS_KEY_ID &&
      parsed.REMOTION_AWS_SECRET_ACCESS_KEY,
  ),
};