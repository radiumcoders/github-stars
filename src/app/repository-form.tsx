"use client";

import { fetchGithubLogin } from "@/app/actions";
import { authClient } from "@/lib/auth-client";
import { normalizeRepoName } from "@/lib/normalize-repo-name";
import { truncateUsername } from "@/lib/truncate-username";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Loader2, LogOut } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/** Brand mark (lucide no longer ships GitHub icons). */
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
  // Relative path — always passes Better Auth trusted-origin checks.
  if (typeof window === "undefined") return "/";
  const path = window.location.pathname || "/";
  const search = window.location.search || "";
  return `${path}${search}` || "/";
}

export function RepositoryForm({
  initialRepository,
  onSubmit,
  loading,
}: {
  initialRepository: string;
  onSubmit: (repository: string) => void;
  loading?: boolean;
}) {
  const router = useRouter();
  const { data: session, isPending, refetch } = authClient.useSession();
  const [repository, setRepository] = useState(
    normalizeRepoName(initialRepository),
  );
  const [githubLogin, setGithubLogin] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const isAuthenticated = Boolean(session?.user);

  useEffect(() => {
    if (!isAuthenticated) {
      setGithubLogin(null);
      return;
    }

    let cancelled = false;
    void fetchGithubLogin().then((login) => {
      if (!cancelled) {
        setGithubLogin(login);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  async function handleSignOut() {
    setAuthError(null);
    setSigningOut(true);
    try {
      const { error } = await authClient.signOut({
        fetchOptions: {
          // Ensure cookies are cleared on this response before we navigate.
          credentials: "include",
        },
      });
      if (error) {
        setAuthError(error.message || "Sign out failed.");
        setSigningOut(false);
        return;
      }
      // Hard navigation so any leftover auth cookies / client cache are gone.
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
        // Client redirect plugin also handles `data.url`; keep this for clarity.
        disableRedirect: false,
      });

      if (error) {
        setAuthError(error.message || "Could not start GitHub sign-in.");
        setSigningIn(false);
        return;
      }

      // If the redirect plugin didn't navigate (SSR/edge cases), do it ourselves.
      if (data?.url && data.redirect !== false) {
        window.location.assign(data.url);
        return;
      }

      // Already signed in / no redirect path — refresh UI.
      await refetch();
      router.refresh();
      setSigningIn(false);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Sign-in failed.");
      setSigningIn(false);
    }
  }

  return (
    <form
      className="w-full max-w-lg border border-border bg-card"
      onSubmit={(event) => {
        event.preventDefault();
        if (!isAuthenticated) return;
        const cleanRepository = normalizeRepoName(repository);
        setRepository(cleanRepository);
        onSubmit(cleanRepository);
      }}
    >
      <div className="border-b border-border px-5 py-4">
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          Configuration
        </p>
        <h2 className="mt-1 text-lg font-medium tracking-tight">
          Generate star video
        </h2>
      </div>

      <div className="flex flex-col gap-5 p-5">
        <div className="flex flex-col gap-3 rounded border border-border bg-muted/30 p-4">
          <Label>GitHub authorization</Label>
          {isPending ? (
            <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Checking session
            </div>
          ) : isAuthenticated ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                {session?.user.image ? (
                  <Image
                    src={session.user.image}
                    alt=""
                    width={32}
                    height={32}
                    className="size-8 rounded-full border border-border"
                  />
                ) : (
                  <div className="flex size-8 items-center justify-center rounded-full border border-border bg-background">
                    <GitHubMark className="size-4" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {session?.user.name ?? session?.user.email}
                  </p>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    Authorized via GitHub OAuth
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={signingOut}
                className="shrink-0 font-mono text-[10px] uppercase"
                onClick={handleSignOut}
              >
                {signingOut ? (
                  <Loader2 data-icon="inline-start" className="animate-spin" />
                ) : (
                  <LogOut data-icon="inline-start" />
                )}
                Sign out
              </Button>
            </div>
          ) : (
            <>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Sign in with GitHub so we can use your OAuth authorization to
                fetch stargazers for repositories you can access.
              </p>
              <Button
                type="button"
                variant="outline"
                disabled={signingIn}
                className="w-full font-mono text-xs uppercase tracking-wider"
                onClick={handleSignIn}
              >
                {signingIn ? (
                  <>
                    <Loader2 data-icon="inline-start" className="animate-spin" />
                    Redirecting to GitHub…
                  </>
                ) : (
                  <>
                    <GitHubMark data-icon="inline-start" className="size-3.5" />
                    Sign in with GitHub
                  </>
                )}
              </Button>
            </>
          )}

          {authError && (
            <p className="font-mono text-[11px] text-destructive">{authError}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="repository">Repository</Label>
          <div className="flex">
            {githubLogin ? (
              <span
                className="inline-flex h-9 max-w-[9rem] shrink-0 items-center border border-r-0 border-input bg-muted/30 px-3 font-mono text-sm text-muted-foreground"
                title={githubLogin}
              >
                <span className="truncate">{truncateUsername(githubLogin, 16)}/</span>
              </span>
            ) : null}
            <Input
              id="repository"
              name="repository"
              placeholder="github-stars"
              className={`font-mono ${githubLogin ? "rounded-l-none" : ""}`}
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              enterKeyHint="go"
              required
              value={repository}
              onChange={(event) => setRepository(event.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Uses your signed-in GitHub account as the owner.
          </p>
        </div>

        <Button
          type="submit"
          disabled={loading || !isAuthenticated || isPending}
          className="w-full font-mono text-xs uppercase tracking-wider"
        >
          {loading ? (
            <>
              <Loader2 data-icon="inline-start" className="animate-spin" />
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
