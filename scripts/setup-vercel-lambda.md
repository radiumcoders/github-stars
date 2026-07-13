# Vercel + Remotion Lambda setup

## How it works on Vercel

| Feature | Where it runs |
|---------|----------------|
| Web app + video preview (Player) | Vercel |
| Fetch stargazers (user's GitHub token) | Vercel serverless |
| MP4 export | **AWS Remotion Lambda** (not Vercel) |

Local FFmpeg rendering does **not** work on Vercel. Export uses Lambda when env vars are set.

## 1. Deploy the Next.js app

1. Push to GitHub (`radiumcoders/github-stars`)
2. [Import on Vercel](https://vercel.com/new) → select the repo
3. Framework: **Next.js** (auto-detected)
4. Deploy (preview works immediately)

## 2. One-time AWS + Remotion Lambda setup (on your machine)

Follow [Remotion Lambda setup](https://www.remotion.dev/docs/lambda/setup):

```bash
# After AWS IAM user + policies are configured, add credentials to .env locally:
# REMOTION_AWS_ACCESS_KEY_ID=...
# REMOTION_AWS_SECRET_ACCESS_KEY=...

npm run lambda:deploy   # prints REMOTION_AWS_FUNCTION_NAME
npm run lambda:site     # prints REMOTION_SERVE_URL
```

Copy both values into Vercel env vars.

## 3. Vercel environment variables

In **Vercel → Project → Settings → Environment Variables**, add:

| Variable | Value |
|----------|--------|
| `NEXT_PUBLIC_BASE_URL` | `https://your-app.vercel.app` |
| `REMOTION_AWS_ACCESS_KEY_ID` | AWS access key |
| `REMOTION_AWS_SECRET_ACCESS_KEY` | AWS secret key |
| `REMOTION_AWS_REGION` | `us-east-1` |
| `REMOTION_AWS_FUNCTION_NAME` | from `lambda:deploy` |
| `REMOTION_SERVE_URL` | from `lambda:site` |

Apply to **Production** and **Preview**. Redeploy.

## 4. After code changes to the video

Re-upload the Remotion site when `src/video/` changes:

```bash
npm run lambda:site
```

## 5. User GitHub tokens

Users paste a **fine-grained PAT** (Contents: Read on their repo) in the UI. Tokens stay in the browser session — not stored on the server.