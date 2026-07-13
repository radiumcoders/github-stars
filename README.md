# Stargazer Wall

Generate a short Remotion animation of a GitHub repository’s stargazers, then export it as MP4.

## Stack

- **Next.js** (App Router) + React 19
- **Better Auth** — GitHub OAuth (token used for the GitHub API)
- **Neon Postgres** — auth tables
- **Remotion** — preview player + local/Lambda MP4 export
- **shadcn/ui** + Tailwind CSS

## Setup

```bash
npm install
cp .env.example .env   # fill in secrets
npm run auth:migrate   # creates Better Auth tables on Neon
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Required env

| Variable | Purpose |
|----------|---------|
| `BETTER_AUTH_SECRET` | Auth encryption secret (`openssl rand -base64 32`) |
| `BETTER_AUTH_URL` / `NEXT_PUBLIC_BASE_URL` | App URL (`http://localhost:3000` locally) |
| `DATABASE_URL` | Neon Postgres connection string |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub OAuth App (callback: `{BASE}/api/auth/callback/github`) |

### Optional — MP4 on Vercel

See [scripts/setup-vercel-lambda.md](./scripts/setup-vercel-lambda.md). Locally, export uses Remotion CLI + FFmpeg when Lambda is not configured.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm run remotion-studio` | Remotion Studio for the composition |
| `npm run auth:migrate` | Apply Better Auth schema to Postgres |
| `npm run lambda:setup` | Deploy Remotion Lambda function + site |

## Flow

1. Sign in with GitHub (OAuth scopes include `repo` for private repos you can access).
2. Enter `owner/repo` and generate a preview.
3. Download MP4 — local FFmpeg when developing; Remotion Lambda in production when configured.
