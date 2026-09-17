# Stargazer Wall

Generate a short Remotion animation of a GitHub repository’s stargazers, then export it as MP4.

The service uses **one owner-registered GitHub App per environment** and **user access tokens**. It requests repository **Metadata: read** and account **Email addresses: read** only. It does not request repository or account write permissions, Contents access, classic `repo`/`public_repo` scopes, a user PAT, or a private key.

## Stack

- **Next.js** (App Router) + React 19
- **Better Auth 1.7.5** — GitHub App user-token sign-in
- **Neon Postgres** — auth tables
- **Remotion** — preview player + **in-browser** MP4 export (`@remotion/web-renderer`)
- **shadcn/ui** + Tailwind CSS

## Toolchain

Use **Node.js 22+** and **pnpm** with the committed `pnpm-lock.yaml`. Do not alternate `npm install` and `pnpm install`. `package-lock.json` is historical and is not the install source.

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local   # fill in non-placeholder secrets locally
pnpm run check:env
pnpm run auth:migrate --dry-run
pnpm run auth:migrate --apply --confirm-target=<database-host>
pnpm run dev
```

Open the exact origin in `BETTER_AUTH_URL` (do not mix `localhost` and `127.0.0.1`).

### Required env

| Variable | Purpose |
|----------|---------|
| `BETTER_AUTH_SECRET` | Auth encryption secret (32+ characters) |
| `BETTER_AUTH_URL` / `NEXT_PUBLIC_BASE_URL` | Same canonical origin |
| `DATABASE_URL` | Neon Postgres connection string |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub **App** OAuth client (not the numeric App ID) |
| `GITHUB_APP_ID` / `GITHUB_APP_SLUG` | Numeric App ID and slug |

Callback: `{BETTER_AUTH_URL}/api/auth/callback/github`  
Setup URL: `{BETTER_AUTH_URL}/github/setup`

See `docs/04-OWNER-SETUP.md`. Templates: `.env.development.example`, `.env.production.example`.

No AWS or FFmpeg setup is required. Export uses the browser’s WebCodecs API.

### Browser support (export)

| Browser | Minimum |
|---------|---------|
| Chrome | 94+ |
| Firefox | 130+ |
| Safari | 26+ |

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm run dev` | Next.js dev server |
| `pnpm run build` | Production build |
| `pnpm run typecheck` | TypeScript check |
| `pnpm run test` | Application unit tests |
| `pnpm run test:e2e` | Browser smoke tests |
| `pnpm run check:env` | Validate env shape (does not prove credentials work) |
| `pnpm run remotion-studio` | Remotion Studio for the composition |
| `pnpm run auth:migrate --dry-run` | Preview Better Auth schema changes |
| `pnpm run auth:migrate --apply --confirm-target=<host>` | Apply schema |
| `pnpm run auth:retire-legacy --dry-run` | Inventory old OAuth grants |
| `pnpm run auth:retire-legacy --apply --confirm-target=<host>` | Revoke old grants after approval |

## Flow

1. Sign in with GitHub (identity / email read only).
2. Connect selected repositories through the GitHub App installation screen.
3. Choose a connected repository and generate a preview.
4. Download MP4 — rendered on **your device** in the browser (keep the tab open).

Existing users of the old OAuth App must reauthorize. Old `repo` grants are not converted to read-only by a code change. See `docs/05-MIGRATION-AND-DEPLOYMENT.md`.
