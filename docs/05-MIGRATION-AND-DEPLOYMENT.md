# Migration, deployment, and rollback

An old OAuth token with `repo` scope does not become read-only because the source array changed. Treat **new App credentials**, **old GitHub grants**, and **local sessions** as separate work.

## Safety

- Dry-run is the default.
- Apply requires `--apply --confirm-target=<database-host>`.
- The retirement command refuses to use the current App Client ID as the legacy target.
- Do not run these commands from a public HTTP route, startup, or every build.
- Do not log tokens or full database URLs.

## Commands

```bash
pnpm run check:env
pnpm run auth:migrate --dry-run
pnpm run auth:retire-legacy --dry-run
# After backup + owner approval:
pnpm run auth:retire-legacy --apply --confirm-target=<database-host>
pnpm run auth:migrate --apply --confirm-target=<database-host>
```

Load `LEGACY_GITHUB_CLIENT_ID` and `LEGACY_GITHUB_CLIENT_SECRET` only in the retirement runner (see `.env.legacy-migration.example`). Those are the **old OAuth App** credentials.

Dry-run reports counts only. Apply revokes matching upstream grants when possible, then clears stored tokens and invalidates affected sessions. Users and provider identity rows are preserved. Unresolved revocations are reported and must not be described as complete.

## Cutover order

1. Announce reauthorization and stop old app instances from storing new legacy tokens.
2. Backup the database. Review dry-run output.
3. Revoke legacy grants while old tokens and the old Client Secret are still available.
4. Clear local token fields and sessions for successfully retired rows.
5. Deploy the corrected build with only the new App credentials.
6. Confirm a fresh sign-in, installation, avatar preview, and MP4 export.

## Rollback

Disable the broken integration or return to a tested **read-only** version. Do not restore the old `repo` OAuth login. Revoked GitHub tokens cannot be resurrected from a database backup.
