# Troubleshooting

Never add write permissions or classic `repo` scopes to “fix” a failure.

| Symptom | Check | Response |
|---|---|---|
| GitHub shows repository write access | Wrong App, old deployment, or leftover OAuth App | Stop, correct the App, retire old grants, reauthorize |
| Login works but generation asks to reconnect | Token provenance, local account row, expired refresh | Sign out and sign in with the new App |
| `email_not_found` | App Email addresses permission | Enable email read only |
| Callback mismatch | Exact origin, path, no wildcard | Align App settings and `BETTER_AUTH_URL` |
| OAuth state error after install | Setup URL routed to OAuth callback | Keep `/github/setup` separate from `/api/auth/callback/github` |
| No connected repositories | Installation missing, pending org approval, wrong App | Connect/approve and refresh |
| Star count without avatars | GitHub stargazer list restriction or pagination | Offer count-only; do not request write access |
| Last people missing / page 0 | Old pagination bug | Covered by `pnpm run test` DATA cases |
| Private result after account switch | Stale client state | Sign-out clears results; ignore in-flight requests |

Logs include a stage and safe status only. Do not paste tokens into chat.
