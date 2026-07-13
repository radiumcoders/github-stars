"use client";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Github, Loader2, LogOut } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

export function RepositoryForm({
  initialRepository,
  onSubmit,
  loading,
}: {
  initialRepository: string;
  onSubmit: (repository: string) => void;
  loading?: boolean;
}) {
  const { data: session, isPending } = authClient.useSession();
  const [repository, setRepository] = useState(initialRepository);
  const [signingIn, setSigningIn] = useState(false);

  const isAuthenticated = Boolean(session?.user);

  return (
    <form
      className="w-full max-w-lg border border-border bg-card"
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
      <div className="border-b border-border px-5 py-4">
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          Configuration
        </p>
        <h2 className="mt-1 text-lg font-medium tracking-tight">Generate star video</h2>
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
                    <Github className="size-4" />
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
                className="shrink-0 font-mono text-[10px] uppercase"
                onClick={() => authClient.signOut()}
              >
                <LogOut className="mr-1.5 size-3" />
                Sign out
              </Button>
            </div>
          ) : (
            <>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Sign in with GitHub so we can use your OAuth authorization to fetch
                stargazers for repositories you can access.
              </p>
              <Button
                type="button"
                variant="outline"
                disabled={signingIn}
                className="w-full font-mono text-xs uppercase tracking-wider"
                onClick={async () => {
                  setSigningIn(true);
                  await authClient.signIn.social({
                    provider: "github",
                    callbackURL: window.location.href,
                  });
                  setSigningIn(false);
                }}
              >
                {signingIn ? (
                  <>
                    <Loader2 className="mr-2 size-3.5 animate-spin" />
                    Redirecting
                  </>
                ) : (
                  <>
                    <Github className="mr-2 size-3.5" />
                    Sign in with GitHub
                  </>
                )}
              </Button>
            </>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="repository">Repository</Label>
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
            value={repository}
            onChange={(event) => setRepository(event.target.value)}
          />
        </div>

        <Button
          type="submit"
          disabled={loading || !isAuthenticated || isPending}
          className="w-full font-mono text-xs uppercase tracking-wider"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 size-3.5 animate-spin" />
              Loading
            </>
          ) : (
            <>
              Generate
              <ArrowRight className="ml-2 size-3.5" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}