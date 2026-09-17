"use client";

import { fetchGithubStars } from "@/app/actions";
import { RepositoryForm, type RepositorySelection } from "@/app/repository-form";
import { ResultCard } from "@/app/result-card";
import { StarLogo } from "@/components/star-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import type { ExportConfig } from "@/lib/export-config";
import type { GithubStarsResult } from "@/lib/github-stars-info";
import {
  defaultPreset,
  defaultPrimaryColor,
  defaultShaderColor,
  defaultTextColor,
  presetColors,
  type PresetId,
} from "@/video/presets";
import { Props } from "@/video/schema";
import { AlertCircle, ExternalLink } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useRef, useState } from "react";

const CompositionPlayer = dynamic(
  () =>
    import("@/app/composition-player").then((m) => m.CompositionPlayer),
  {
    ssr: false,
    loading: () => (
      <div className="flex size-full items-center justify-center gap-2 text-sm text-muted-foreground">
        <Spinner className="size-3.5" />
        Loading player
      </div>
    ),
  },
);

function errorTitle(code: GithubStarsResult extends { ok: false } ? GithubStarsResult["code"] : string) {
  switch (code) {
    case "missing_token":
    case "reconnect_required":
      return "Reconnect GitHub";
    case "not_configured":
      return "GitHub connection is unavailable";
    case "install_required":
      return "Connect repositories";
    case "stargazers_unavailable":
      return "Stargazer avatars are unavailable";
    case "rate_limited":
      return "GitHub request limit reached";
    case "forbidden":
      return "Repository unavailable";
    case "not_found":
    case "repository_unavailable":
      return "Repository unavailable";
    default:
      return "Could not load repository";
  }
}

export function StarsViewer({
  initialRepository,
  exportConfig,
}: {
  initialRepository: string;
  exportConfig: ExportConfig;
}) {
  const [repository, setRepository] = useState(initialRepository);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GithubStarsResult | null>(null);
  const [preset, setPreset] = useState<PresetId>(defaultPreset);
  const [primaryColor, setPrimaryColor] = useState(defaultPrimaryColor);
  const [shaderColor, setShaderColor] = useState(defaultShaderColor);
  const [textColor, setTextColor] = useState(defaultTextColor);
  const [lastSelection, setLastSelection] = useState<RepositorySelection | null>(null);
  const requestId = useRef(0);

  const handlePresetChange = useCallback((next: PresetId) => {
    setPreset(next);
    const colors = presetColors(next);
    setPrimaryColor(colors.primary);
    setShaderColor(colors.shader);
    setTextColor(colors.text);
  }, []);

  const handleSessionUserChange = useCallback((userId: string | null) => {
    requestId.current += 1;
    setResult(null);
    setLoading(false);
    if (!userId) {
      setRepository("");
      setLastSelection(null);
    }
  }, []);

  const runFetch = useCallback(async (selection: RepositorySelection, countOnly = false) => {
    setLastSelection(selection);
    setRepository(selection.repository);
    setLoading(true);
    const current = ++requestId.current;
    setResult(null);
    try {
      const data = await fetchGithubStars(selection.repository, {
        repositoryId: selection.repositoryId,
        countOnly,
      });
      if (current !== requestId.current) return;
      setResult(data);
    } catch {
      if (current !== requestId.current) return;
      setResult({
        ok: false,
        code: "unknown",
        message: "Could not read GitHub data. Try again later.",
      });
    } finally {
      if (current === requestId.current) setLoading(false);
    }
  }, []);

  const inputProps =
    !loading && result?.ok === true
      ? {
          ...(result.data as Partial<Props>),
          preset,
          primaryColor,
          shaderColor,
          textColor,
        }
      : undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-10 shrink-0 items-stretch border-b border-border">
        <div className="flex w-full items-center justify-between px-4 lg:w-80 lg:border-r lg:border-border">
          <div className="flex items-center gap-2">
            <StarLogo className="size-6 text-foreground" />
            <span className="text-sm font-medium tracking-tight">
              GitHub Stars
            </span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="sm" asChild>
              <a
                href="https://github.com/radiumcoders/github-stars"
                target="_blank"
                rel="noreferrer noopener"
              >
                <ExternalLink data-icon="inline-start" />
                Source
              </a>
            </Button>
          </div>
        </div>
        <div className="hidden min-w-0 flex-1 items-center justify-between px-4 lg:flex">
          <span className="text-sm font-medium">Preview</span>
          {inputProps ? (
            <span className="truncate font-mono text-xs text-muted-foreground">
              {inputProps.user}/{inputProps.repository}
            </span>
          ) : (
            <span className="font-mono text-xs text-muted-foreground">
              1280 × 720
            </span>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside className="flex w-full shrink-0 flex-col border-b border-border lg:w-80 lg:border-b-0 lg:border-r">
          <RepositoryForm
            initialRepository={repository}
            onSubmit={(selection) => void runFetch(selection)}
            loading={loading}
            onSessionUserChange={handleSessionUserChange}
          />
          <p className="mt-auto border-t border-border px-4 py-3 text-[11px] text-muted-foreground">
            Not endorsed or affiliated with GitHub.
          </p>
        </aside>

        <section className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex h-10 shrink-0 items-center justify-between border-b border-border px-4 lg:hidden">
            <span className="text-sm font-medium">Preview</span>
            <span className="font-mono text-xs text-muted-foreground">
              {inputProps
                ? `${inputProps.user}/${inputProps.repository}`
                : "1280 × 720"}
            </span>
          </div>
          <ResultCard
          inputProps={inputProps}
          exportConfig={exportConfig}
          preset={preset}
          onPresetChange={handlePresetChange}
          primaryColor={primaryColor}
          onPrimaryColorChange={setPrimaryColor}
          shaderColor={shaderColor}
          onShaderColorChange={setShaderColor}
          textColor={textColor}
          onTextColorChange={setTextColor}
        >
          {loading ? (
            <Empty className="size-full border-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Spinner />
                </EmptyMedia>
                <EmptyTitle>Fetching stargazers</EmptyTitle>
                <EmptyDescription>
                  Reading the repository so we can build the preview.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : null}

          {!loading && result?.ok === false ? (
            <div className="flex size-full flex-col items-center justify-center gap-4 p-6">
              <Alert variant="destructive" className="max-w-md">
                <AlertCircle />
                <AlertTitle>{errorTitle(result.code)}</AlertTitle>
                <AlertDescription>
                  {result.message}
                  {result.code === "rate_limited" && result.retryAt
                    ? ` Retry after ${new Date(result.retryAt).toLocaleTimeString()}.`
                    : null}
                </AlertDescription>
              </Alert>
              {result.code === "stargazers_unavailable" && lastSelection ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void runFetch(lastSelection, true)}
                >
                  Create count-only video
                </Button>
              ) : null}
            </div>
          ) : null}

          {!loading && result?.ok === true ? (
            <div className="flex size-full flex-col">
              {result.mode === "count_only" ? (
                <p className="border-b border-border px-4 py-2 text-center text-xs text-muted-foreground">
                  Count-only video: star count is shown without stargazer avatars.
                </p>
              ) : null}
              <CompositionPlayer
                inputProps={{
                  ...result.data,
                  preset,
                  primaryColor,
                  shaderColor,
                  textColor,
                }}
              />
            </div>
          ) : null}

          {!loading && result === null ? (
            <Empty className="size-full border-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <StarLogo className="size-6" />
                </EmptyMedia>
                <EmptyTitle>No preview yet</EmptyTitle>
                <EmptyDescription>
                  Sign in, connect a repository, and generate a preview.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : null}
        </ResultCard>
        </section>
      </div>
    </div>
  );
}
