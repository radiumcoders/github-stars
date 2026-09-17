# Owner setup: GitHub App read-only access

Audience: the person who operates this service. Register a **GitHub App**, not an OAuth App.

## Permissions

- Repository: **Metadata → Read-only**
- Account: **Email addresses → Read-only**
- All other repository, account, and organization permissions: **No access**
- Do not enable Contents or Starring
- Expire user authorization tokens: **on**
- Request user authorization during installation: **off**
- Webhooks: **off**
- No private key / PEM is required

## Development registration

| Field | Value |
|---|---|
| Callback URL | `http://localhost:3000/api/auth/callback/github` |
| Setup URL | `http://localhost:3000/github/setup` |
| Wildcard callback matching | Disabled |

Use the App **Client ID** and **Client Secret** in `.env.local`, plus the numeric **App ID** and **slug**.

```powershell
Copy-Item .env.example .env.local
pnpm install --frozen-lockfile
pnpm run check:env
pnpm run auth:migrate --dry-run
pnpm run auth:migrate --apply --confirm-target=<your-neon-host>
pnpm run dev
```

Generate `BETTER_AUTH_SECRET` locally and never paste it into chat or a PR:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

## First test

Use a fresh browser session. Sign in, confirm the consent screen has no write permission, connect **only selected repositories**, generate a repository with nonzero stars, preview, and open the downloaded MP4.

A zero-star repository cannot prove avatar fetch. Count-only recovery is not a substitute for the full-avatar release gate.

## Production

Create a **separate** App with the same policy and HTTPS callback/setup URLs. Use a separate database and Better Auth secret. Keep preview deployments isolated from production secrets.
