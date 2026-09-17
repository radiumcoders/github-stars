# Pull request description (do not open without owner approval)

## Summary

- Replace classic GitHub OAuth `repo` scope with a service-owned GitHub App user-token flow (metadata read + email read).
- Add installation/connection, token provenance checks, pagination repair, typed errors, and guarded migrations.

## Test plan

- [ ] `pnpm install --frozen-lockfile`
- [ ] `pnpm run check:env` (sandbox env)
- [ ] `pnpm run lint`
- [ ] `pnpm run typecheck`
- [ ] `pnpm run test`
- [ ] `pnpm run test:e2e`
- [ ] `pnpm run build`
- [ ] Fresh read-only consent, connected public repo with stars, playable MP4
- [ ] Selected private repo, second account, refresh, and access removal (owner sandbox)

Live OAuth/export checks remain owner-gated when credentials are not provided.
