# Vercel + Remotion Lambda setup

## How it works

| Feature | Where it runs |
|---------|----------------|
| Web app + video preview (Player) | Vercel |
| Auth (Better Auth + Neon) + GitHub OAuth | Vercel |
| Fetch stargazers (user's OAuth token) | Vercel serverless |
| MP4 export | **AWS Remotion Lambda** (not Vercel) |

Local FFmpeg rendering does **not** work on Vercel. Export uses Lambda when env vars are set.

## 1. Deploy the Next.js app

1. Push to GitHub
2. [Import on Vercel](https://vercel.com/new)
3. Framework: **Next.js**
4. Set environment variables (below), then deploy

## 2. Auth env vars

| Variable | Notes |
|----------|--------|
| `NEXT_PUBLIC_BASE_URL` | Production URL, e.g. `https://starwall.example.com` |
| `BETTER_AUTH_URL` | Same as public base URL |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` |
| `DATABASE_URL` | Neon Postgres connection string |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub OAuth App; callback `https://…/api/auth/callback/github` |

Run once against Neon: `npm run auth:migrate`

## 3. One-time AWS + Remotion Lambda (on your machine)

Follow [Remotion Lambda setup](https://www.remotion.dev/docs/lambda/setup):

```bash
# After AWS IAM user + policies are configured, add credentials to .env locally:
# REMOTION_AWS_ACCESS_KEY_ID=...
# REMOTION_AWS_SECRET_ACCESS_KEY=...

npm run lambda:deploy   # prints REMOTION_AWS_FUNCTION_NAME
npm run lambda:site     # prints REMOTION_SERVE_URL
```

Copy both values into Vercel env vars.

## 4. Remotion env vars (Vercel)

| Variable | Value |
|----------|--------|
| `REMOTION_AWS_ACCESS_KEY_ID` | AWS access key |
| `REMOTION_AWS_SECRET_ACCESS_KEY` | AWS secret key |
| `REMOTION_AWS_REGION` | `us-east-1` |
| `REMOTION_AWS_FUNCTION_NAME` | from `lambda:deploy` |
| `REMOTION_SERVE_URL` | from `lambda:site` |

Apply to **Production** and **Preview**. Redeploy.

## 5. After video composition changes

Re-upload the Remotion site when `src/video/` changes:

```bash
npm run lambda:site
```

## Local development

Without Lambda, MP4 export uses local Remotion CLI + FFmpeg (`npm run remotion-studio` optional).
