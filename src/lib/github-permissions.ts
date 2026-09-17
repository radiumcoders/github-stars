export const EXPECTED_POLICY = {
  repository: {
    metadata: "read",
  },
  account: {
    emails: "read",
  },
  organization: {},
} as const;

const NONE_VALUES = new Set([
  "none",
  "no access",
  "no-access",
  "no_access",
  "false",
]);

export type PermissionAudit = {
  ok: boolean;
  reasons: string[];
  scope: string;
};

function isNone(value: unknown): boolean {
  if (value === undefined || value === null || value === false) return true;
  if (typeof value === "string" && NONE_VALUES.has(value.trim().toLowerCase())) {
    return true;
  }
  return false;
}

function auditMap(
  value: unknown,
  required: Record<string, "read">,
  label: string,
): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [`${label} permissions are missing or invalid.`];
  }
  const reasons: string[] = [];
  const record = value as Record<string, unknown>;
  for (const [key, expected] of Object.entries(required)) {
    if (record[key] !== expected) {
      reasons.push(`${label}.${key} must be ${expected}.`);
    }
  }
  for (const [key, permission] of Object.entries(record)) {
    if (key in required) continue;
    if (!isNone(permission)) {
      reasons.push(`${label}.${key} is outside the read-only policy.`);
    }
  }
  return reasons;
}

export function auditPermissionSnapshot(snapshot: unknown): PermissionAudit {
  const scope =
    "Local policy snapshot only; not live proof of the GitHub App registration.";
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return { ok: false, reasons: ["Permission snapshot is missing."], scope };
  }
  const candidate = snapshot as {
    repository?: unknown;
    account?: unknown;
    organization?: unknown;
  };
  const reasons = [
    ...auditMap(candidate.repository, { metadata: "read" }, "repository"),
    ...auditMap(candidate.account, { emails: "read" }, "account"),
    ...auditMap(candidate.organization ?? {}, {}, "organization"),
  ];
  return { ok: reasons.length === 0, reasons, scope };
}

export function auditInstallation(
  installation: unknown,
  expectedAppId: number,
  expectedSlug: string,
): PermissionAudit {
  if (!Number.isInteger(expectedAppId) || expectedAppId < 1) {
    throw new TypeError("Expected App ID must be a positive integer.");
  }
  if (typeof expectedSlug !== "string" || !expectedSlug.trim()) {
    throw new TypeError("Expected App slug is required.");
  }

  const scope =
    "Installation metadata only; review account permissions separately in GitHub App settings.";
  if (!installation || typeof installation !== "object") {
    return { ok: false, reasons: ["Installation is missing."], scope };
  }

  const row = installation as {
    app_id?: unknown;
    app_slug?: unknown;
    suspended_at?: unknown;
    permissions?: unknown;
  };
  const reasons: string[] = [];

  if (row.app_id !== expectedAppId) {
    reasons.push("Installation does not belong to the configured GitHub App.");
  }
  if (
    typeof row.app_slug !== "string" ||
    row.app_slug.trim().toLowerCase() !== expectedSlug.trim().toLowerCase()
  ) {
    reasons.push("Installation slug does not match the configured GitHub App.");
  }
  if (row.suspended_at !== null) {
    reasons.push("Installation is suspended or unavailable.");
  }

  const permissions = row.permissions;
  if (!permissions || typeof permissions !== "object" || Array.isArray(permissions)) {
    reasons.push("Installation permissions are missing.");
  } else {
    const map = permissions as Record<string, unknown>;
    if (map.metadata !== "read") {
      reasons.push("Installation must have repository metadata read.");
    }
    for (const [key, permission] of Object.entries(map)) {
      if (key === "metadata" && permission === "read") continue;
      if (!isNone(permission)) {
        reasons.push(`Installation permission ${key} is outside the read-only policy.`);
      }
    }
  }

  return { ok: reasons.length === 0, reasons, scope };
}

export function isForbiddenOAuthScope(scope: string): boolean {
  const normalized = scope.trim().toLowerCase();
  return (
    normalized === "repo" ||
    normalized === "public_repo" ||
    normalized.includes("repo:") ||
    normalized.endsWith(":write") ||
    normalized.includes("write:")
  );
}
