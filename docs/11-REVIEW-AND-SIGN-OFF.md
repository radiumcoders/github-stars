# Review and sign-off

Do not release until a **fresh** read-only GitHub App authorization produces real avatars and a playable MP4 for a repository with nonzero stars.

Application unit tests and this documentation are not a substitute for that live gate.

Confirm:

- Consent and App settings request Metadata read + Email read only
- Tokens are not returned by `/api/auth/get-access-token` or `/api/auth/refresh-token`
- Generation re-checks the current user's installations; a query `installation_id` is not authorization
- Count-only is explicit and never fills demo faces
- Migration dry-run does not write; apply requires `--confirm-target`
- Rollback would not restore classic `repo` OAuth

Owner approval is still required for production migration, grant revocation, and deployment.
