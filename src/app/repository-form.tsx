"use client";

import { authClient } from "@/lib/auth-client";
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
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { ArrowRight, LogOut, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

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
  const [repository, setRepository] = useState(initialRepository);
  const [signingIn, setSigningIn] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const isAuthenticated = Boolean(session?.user);

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

  return (
    <form
      className="flex flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        if (!isAuthenticated) return;
        const cleanRepository = repository
          .trim()
          .replace(/^(https?:\/\/)?github.com\//, "");
        setRepository(cleanRepository);
        onSubmit(cleanRepository);
      }}
    >
      <div className="flex flex-col gap-1 px-4 py-4">
        <h2 className="text-sm font-medium">Project</h2>
        <p className="text-sm text-muted-foreground">
          Sign in and choose a repository to preview.
        </p>
      </div>
      <Separator />
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
                  Use GitHub so we can fetch stargazers for repositories you can
                  access.
                </FieldDescription>
                <Alert>
                  <TriangleAlert />
                  <AlertTitle>Private repos too</AlertTitle>
                  <AlertDescription>
                    GitHub will also ask for access to private repositories. We
                    only read stargazers for the repo you enter — we don&apos;t
                    clone, change, or otherwise use them. You can always{" "}
                    <a
                      href="https://github.com/radiumcoders/github-stars"
                      target="_blank"
                      rel="noreferrer noopener"
                      className="font-medium underline underline-offset-2"
                    >
                      self-host this app
                    </a>{" "}
                    if you&apos;d rather keep that on your machine.
                  </AlertDescription>
                </Alert>
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

          <Field>
            <FieldLabel htmlFor="repository">Repository</FieldLabel>
            <Input
              id="repository"
              name="repository"
              placeholder="owner/repo"
              className="font-mono"
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              enterKeyHint="go"
              required
              disabled={!isAuthenticated || isPending}
              value={repository}
              onChange={(event) => setRepository(event.target.value)}
            />
          </Field>
        </FieldGroup>
      </div>
      <div className="px-4 pb-4">
        <Button
          type="submit"
          disabled={loading || !isAuthenticated || isPending}
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
