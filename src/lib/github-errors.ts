export type GithubErrorCode =
  | "missing_token"
  | "reconnect_required"
  | "not_configured"
  | "install_required"
  | "repository_unavailable"
  | "forbidden"
  | "rate_limited"
  | "stargazers_unavailable"
  | "invalid_request"
  | "upstream_unavailable"
  | "unknown";

export class GithubAppError extends Error {
  readonly code: GithubErrorCode;
  readonly retryAt?: string;
  readonly status?: number;

  constructor(
    code: GithubErrorCode,
    message: string,
    options?: { retryAt?: string; status?: number },
  ) {
    super(message);
    this.name = "GithubAppError";
    this.code = code;
    this.retryAt = options?.retryAt;
    this.status = options?.status;
  }
}

export function userMessageFor(code: GithubErrorCode, fallback?: string): string {
  switch (code) {
    case "missing_token":
    case "reconnect_required":
      return "Reconnect your GitHub account. The previous authorization expired, was revoked, or belongs to the old integration.";
    case "not_configured":
      return "GitHub connection is unavailable. The service owner needs to finish configuration.";
    case "install_required":
      return "Connect a repository before generating a video. No source-code access or write permission is requested.";
    case "repository_unavailable":
      return "Repository unavailable. It may not exist, may not be selected, or may not be accessible to your account.";
    case "forbidden":
      return "GitHub did not allow this request. Check repository access.";
    case "rate_limited":
      return "GitHub request limit reached. Try again after the displayed retry time.";
    case "stargazers_unavailable":
      return "We could read the repository metadata, but GitHub did not provide the list of people.";
    case "invalid_request":
      return "Enter an owner/repository or a plain GitHub repository URL.";
    case "upstream_unavailable":
      return "GitHub is temporarily unavailable. Your permissions were not changed. Try again later.";
    default:
      return fallback || "Could not read GitHub data. Try again later.";
  }
}

type HeaderSource = Headers | Record<string, string | number | null | undefined>;

function asHeaders(raw: HeaderSource | undefined): Headers {
  if (!raw) return new Headers();
  if (raw instanceof Headers) return raw;
  return new Headers(
    Object.entries(raw)
      .filter(([, value]) => value !== null && value !== undefined)
      .map(([key, value]) => [key, String(value)]),
  );
}

export function classifyGithubError(
  error: unknown,
  now = Date.now(),
): { code: GithubErrorCode; message: string; retryAt?: string; status?: number } {
  const err = error as {
    status?: number;
    response?: { headers?: HeaderSource; data?: { message?: string } };
    headers?: HeaderSource;
    message?: string;
  };
  const status = typeof err?.status === "number" ? err.status : 0;
  const headers = asHeaders(err?.response?.headers ?? err?.headers);
  const rawMessage = String(
    err?.response?.data?.message ?? err?.message ?? "",
  ).toLowerCase();
  const rateSignal =
    headers.get("x-ratelimit-remaining") === "0" ||
    headers.has("retry-after") ||
    /secondary rate limit|rate limit exceeded/.test(rawMessage);

  if (status === 429 || (status === 403 && rateSignal)) {
    const retry = headers.get("retry-after");
    let retryMs = retry && /^\d+$/.test(retry) ? now + Number(retry) * 1000 : NaN;
    if (!Number.isFinite(retryMs) && retry) retryMs = Date.parse(retry);
    if (!Number.isFinite(retryMs)) {
      const reset = headers.get("x-ratelimit-reset");
      retryMs = reset && /^\d+$/.test(reset) ? Number(reset) * 1000 : NaN;
    }
    if (!Number.isFinite(retryMs) || retryMs <= now || retryMs > 8.64e15) {
      retryMs = now + 60_000;
    }
    return {
      code: "rate_limited",
      message: userMessageFor("rate_limited"),
      retryAt: new Date(retryMs).toISOString(),
      status,
    };
  }
  if (status === 401) {
    return {
      code: "reconnect_required",
      message: userMessageFor("reconnect_required"),
      status,
    };
  }
  if (status === 404) {
    return {
      code: "repository_unavailable",
      message: userMessageFor("repository_unavailable"),
      status,
    };
  }
  if (status === 403) {
    return { code: "forbidden", message: userMessageFor("forbidden"), status };
  }
  if (status === 422) {
    return {
      code: "invalid_request",
      message: userMessageFor("invalid_request"),
      status,
    };
  }
  return {
    code: "upstream_unavailable",
    message: userMessageFor("upstream_unavailable"),
    status: status || undefined,
  };
}

export function sanitizeLogMeta(meta: Record<string, unknown>): Record<string, unknown> {
  const blocked = /token|secret|authorization|password|cookie|database/i;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (blocked.test(key)) continue;
    if (typeof value === "string" && value.length > 180) {
      out[key] = `${value.slice(0, 80)}…`;
    } else {
      out[key] = value;
    }
  }
  return out;
}
