"use client";

import { authClient } from "@/lib/auth-client";
import type { ConnectedRepository } from "@/lib/github-types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { ArrowRight, LogOut, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

function GitHubMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={className}
    >
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" />
    </svg>
  );
}

function homeCallbackURL() {
  if (typeof window === "undefined") return "/";
  const path = window.location.pathname || "/";
  const search = window.location.search || "";
  return `${path}${search}` || "/";
}

function userInitials(name: string | null | undefined) {
  if (!name) return "GH";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export type RepositorySelection = {
  repository: string;
  repositoryId?: number;
};

export function RepositoryForm({
  initialRepository,
  onSubmit,
  loading,
  onSessionUserChange,
}: {
  initialRepository: string;
  onSubmit: (selection: RepositorySelection) => void;
  loading?: boolean;
  onSessionUserChange?: (userId: string | null) => void;
}) {
  const router = useRouter();
  const { data: session, isPending, refetch } = authClient.useSession();
  const [repository, setRepository] = useState(initialRepository);
  const [repositoryId, setRepositoryId] = useState<number | undefined>();
  const [signingIn, setSigningIn] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [configured, setConfigured] = useState(true);
  const [allowManualRepository, setAllowManualRepository] = useState(false);
  const [configIssues, setConfigIssues] = useState<string[]>([]);
  const [repositories, setRepositories] = useState<ConnectedRepository[]>([]);
  const [manageUrl, setManageUrl] = useState<string | null>(null);

  const isAuthenticated = Boolean(session?.user);
  const userId = session?.user?.id ?? null;

  useEffect(() => {
    onSessionUserChange?.(userId);
  }, [onSessionUserChange, userId]);

  const loadConnection = useCallback(async () => {
    if (!userId) return;
    setRefreshing(true);
    try {
      const response = await fetch("/api/github/connection", {
        credentials: "include",
        cache: "no-store",
      });
      const data = (await response.json().catch(() => null)) as {
        error?: string;
        configured?: boolean;
        allowManualRepository?: boolean;
        issues?: string[];
        repositories?: ConnectedRepository[];
        manageUrl?: string;
      } | null;
      if (!response.ok) {
        setAuthError(data?.error || "Could not load connected repositories.");
        return;
      }
      setConfigured(data?.configured !== false);
      setAllowManualRepository(data?.allowManualRepository === true);
      setConfigIssues(Array.isArray(data?.issues) ? data.issues : []);
      setRepositories(Array.isArray(data?.repositories) ? data.repositories : []);
      setManageUrl(typeof data?.manageUrl === "string" ? data.manageUrl : null);
      setAuthError(null);
    } catch {
      setAuthError("Could not load connected repositories.");
    } finally {
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    fetch("/api/github/connection", {
      credentials: "include",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
          configured?: boolean;
          allowManualRepository?: boolean;
          issues?: string[];
          repositories?: ConnectedRepository[];
          manageUrl?: string;
        } | null;
        if (controller.signal.aborted) return;
        if (!response.ok) {
          setAuthError(data?.error || "Could not load connected repositories.");
          return;
        }
        setConfigured(data?.configured !== false);
        setAllowManualRepository(data?.allowManualRepository === true);
        setConfigIssues(Array.isArray(data?.issues) ? data.issues : []);
        setRepositories(Array.isArray(data?.repositories) ? data.repositories : []);
        setManageUrl(typeof data?.manageUrl === "string" ? data.manageUrl : null);
        setAuthError(null);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof DOMException && error.name === "AbortError") return;
        setAuthError("Could not load connected repositories.");
      });
    return () => controller.abort();
  }, [userId]);

  async function handleSignOut() {
    setAuthError(null);
    setSigningOut(true);
    try {
      const { error } = await authClient.signOut({
        fetchOptions: {
          credentials: "include",
        },
      });
      if (error) {
        setAuthError(error.message || "Sign out failed.");
        setSigningOut(false);
        return;
      }
      window.location.assign("/");
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Sign out failed.");
      setSigningOut(false);
    }
  }

  async function handleSignIn() {
    setAuthError(null);
    setSigningIn(true);
    try {
      const { data, error } = await authClient.signIn.social({
        provider: "github",
        callbackURL: homeCallbackURL(),
        errorCallbackURL: homeCallbackURL(),
        disableRedirect: false,
      });

      if (error) {
        setAuthError(error.message || "Could not start GitHub sign-in.");
        setSigningIn(false);
        return;
      }

      if (data?.url && data.redirect !== false) {
        window.location.assign(data.url);
        return;
      }

      await refetch();
      router.refresh();
      setSigningIn(false);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Sign-in failed.");
      setSigningIn(false);
    }
  }

  async function handleConnect() {
    setAuthError(null);
    setConnecting(true);
    try {
      const response = await fetch("/api/github/install", {
        method: "POST",
        credentials: "include",
      });
      const data = (await response.json().catch(() => null)) as {
        url?: string;
        error?: string;
      } | null;
      if (!response.ok || typeof data?.url !== "string") {
        setAuthError(data?.error || "Could not start repository connection.");
        setConnecting(false);
        return;
      }
      const url = new URL(data.url);
      if (url.origin !== "https://github.com") {
        setAuthError("Unexpected install URL.");
        setConnecting(false);
        return;
      }
      window.location.assign(url.toString());
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Could not start repository connection.");
      setConnecting(false);
    }
  }

  const connected = repositories.length > 0;
  const canPickRepository = connected || allowManualRepository;
  const canGenerate = isAuthenticated && canPickRepository && !isPending;
  const showAppInstall = isAuthenticated && configured && !allowManualRepository;

  return (
    <form
      className="flex flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        if (!canGenerate) return;
        const selected = repositories.find((row) => row.fullName === repository);
        onSubmit({
          repository: selected?.fullName ?? repository.trim(),
          repositoryId: selected?.id ?? repositoryId,
        });
      }}
    >
      <div className="px-4 py-4">
        <FieldGroup className="gap-4">
          <Field data-invalid={Boolean(authError) || undefined}>
            <FieldLabel>GitHub account</FieldLabel>
            {isPending ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Spinner className="size-3.5" />
                Checking session
              </div>
            ) : isAuthenticated ? (
              <div className="flex items-center justify-between gap-3 rounded-sm border border-border p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar className="size-8">
                    {session?.user.image ? (
                      <AvatarImage src={session.user.image} alt="" />
                    ) : null}
                    <AvatarFallback>
                      {session?.user.image ? (
                        <GitHubMark className="size-3.5" />
                      ) : (
                        userInitials(session?.user.name)
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {session?.user.name ?? session?.user.email}
                    </p>
                    <p className="truncate font-mono text-[11px] text-muted-foreground">
                      {session?.user.email}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={signingOut}
                  className="shrink-0"
                  onClick={handleSignOut}
                >
                  {signingOut ? (
                    <Spinner data-icon="inline-start" />
                  ) : (
                    <LogOut data-icon="inline-start" />
                  )}
                  Sign out
                </Button>
              </div>
            ) : (
              <>
                <FieldDescription>
                  Sign in with GitHub — read-only access. We do not request
                  permission to edit your repositories.
                </FieldDescription>
                <Button
                  type="button"
                  variant="outline"
                  disabled={signingIn}
                  onClick={handleSignIn}
                >
                  {signingIn ? (
                    <>
                      <Spinner data-icon="inline-start" />
                      Redirecting to GitHub
                    </>
                  ) : (
                    <>
                      <GitHubMark data-icon="inline-start" />
                      Sign in with GitHub
                    </>
                  )}
                </Button>
              </>
            )}
            {authError ? <FieldError>{authError}</FieldError> : null}
          </Field>

          {isAuthenticated && !configured ? (
            <Alert>
              <AlertTitle>GitHub connection is unavailable</AlertTitle>
              <AlertDescription>
                {configIssues.length > 0
                  ? configIssues.join(" ")
                  : "The service owner needs to finish configuration. After changing Vercel env vars, redeploy the app."}
              </AlertDescription>
            </Alert>
          ) : null}

          {isAuthenticated && configured && allowManualRepository && configIssues.length > 0 ? (
            <Alert>
              <AlertTitle>GitHub App is not fully configured</AlertTitle>
              <AlertDescription>
                You can still enter a public owner/repo. To connect private
                repositories, fix: {configIssues.join(" ")}
              </AlertDescription>
            </Alert>
          ) : null}

          {showAppInstall ? (
            <Field>
              <FieldLabel>Repository access</FieldLabel>
              {connected ? (
                <FieldDescription>
                  Connected with read-only access. Choose a repository and
                  generate your video.
                </FieldDescription>
              ) : (
                <FieldDescription>
                  Choose the repositories this service can use. No source-code
                  access or write permission is requested.
                </FieldDescription>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={connecting}
                  onClick={handleConnect}
                >
                  {connecting ? (
                    <Spinner data-icon="inline-start" />
                  ) : (
                    <GitHubMark data-icon="inline-start" />
                  )}
                  {connected ? "Connect more" : "Connect repositories"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={refreshing}
                  onClick={() => void loadConnection()}
                >
                  {refreshing ? (
                    <Spinner data-icon="inline-start" />
                  ) : (
                    <RefreshCw data-icon="inline-start" />
                  )}
                  Refresh
                </Button>
                {manageUrl ? (
                  <Button type="button" variant="ghost" size="sm" asChild>
                    <a href={manageUrl} target="_blank" rel="noreferrer noopener">
                      Manage access
                    </a>
                  </Button>
                ) : null}
              </div>
            </Field>
          ) : null}

          <Field>
            <FieldLabel htmlFor="repository">Repository</FieldLabel>
            {connected && !allowManualRepository ? (
              <select
                id="repository"
                name="repository"
                className="h-9 w-full rounded-sm border border-input bg-background px-2 font-mono text-sm"
                disabled={!isAuthenticated || isPending || loading}
                value={repository}
                onChange={(event) => {
                  const next = event.target.value;
                  const selected = repositories.find((row) => row.fullName === next);
                  setRepository(next);
                  setRepositoryId(selected?.id);
                }}
              >
                <option value="">Select a connected repository</option>
                {repositories.map((row) => (
                  <option key={row.id} value={row.fullName}>
                    {row.fullName}
                    {row.private ? " (private)" : ""}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                id="repository"
                name="repository"
                placeholder="owner/repo"
                className="font-mono"
                autoCapitalize="off"
                autoComplete="off"
                autoCorrect="off"
                enterKeyHint="go"
                list={allowManualRepository && repositories.length > 0 ? "connected-repositories" : undefined}
                disabled={!isAuthenticated || isPending || loading || !canPickRepository}
                value={repository}
                onChange={(event) => {
                  setRepository(event.target.value);
                  setRepositoryId(undefined);
                }}
              />
            )}
            {allowManualRepository && repositories.length > 0 ? (
              <datalist id="connected-repositories">
                {repositories.map((row) => (
                  <option key={row.id} value={row.fullName} />
                ))}
              </datalist>
            ) : null}
            {allowManualRepository && isAuthenticated ? (
              <FieldDescription>
                Enter owner/repo. Public repositories work with read-only
                sign-in.
              </FieldDescription>
            ) : null}
            {!connected && isAuthenticated && !allowManualRepository ? (
              <FieldDescription>
                No connected repositories yet. Connect a repository or check
                whether an administrator still needs to approve your request.
              </FieldDescription>
            ) : null}
          </Field>
        </FieldGroup>
      </div>
      <div className="px-4 pb-4">
        <Button
          type="submit"
          disabled={loading || !canGenerate || !repository}
          className="w-full"
        >
          {loading ? (
            <>
              <Spinner data-icon="inline-start" />
              Loading
            </>
          ) : (
            <>
              Generate
              <ArrowRight data-icon="inline-end" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
