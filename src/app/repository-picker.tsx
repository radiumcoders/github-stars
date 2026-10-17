"use client";

import { fetchGithubRepositories } from "@/app/actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import type {
  GithubRepository,
  GithubRepositoryGroup,
} from "@/lib/github-repositories";
import { cn } from "@/lib/utils";
import { Lock, RefreshCw, Star } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const compactNumber = new Intl.NumberFormat("en", { notation: "compact" });

export function RepositoryPicker({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (repository: string) => void;
  disabled?: boolean;
}) {
  const [groups, setGroups] = useState<GithubRepositoryGroup[] | null>(null);
  // True from the start: the list is requested as soon as the user is signed in.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const requested = useRef(false);

  const request = useCallback(
    () =>
      fetchGithubRepositories()
        .then((result) => {
          if (result.ok) {
            setGroups(result.groups);
          } else {
            setError(result.message);
          }
        })
        .catch(() => {
          setError(
            "Couldn't load your repositories. You can still type owner/repo.",
          );
        })
        .finally(() => setLoading(false)),
    [],
  );

  function reload() {
    setLoading(true);
    setError(null);
    void request();
  }

  useEffect(() => {
    if (disabled || requested.current) return;
    requested.current = true;
    void request();
  }, [disabled, request]);

  const normalized = value.trim().toLowerCase();
  const allRepositories = useMemo(
    () => groups?.flatMap((group) => group.repositories) ?? [],
    [groups],
  );
  // Once a repo is picked, keep the whole list visible so it's easy to switch.
  const isExactMatch = allRepositories.some(
    (repo) => repo.fullName.toLowerCase() === normalized,
  );
  const visibleGroups = useMemo(() => {
    if (!groups) return [];
    if (!normalized || isExactMatch) return groups;
    return groups
      .map((group) => ({
        ...group,
        repositories: group.repositories.filter((repo) =>
          repo.fullName.toLowerCase().includes(normalized),
        ),
      }))
      .filter((group) => group.repositories.length > 0);
  }, [groups, normalized, isExactMatch]);
  const visibleRepositories = visibleGroups.flatMap(
    (group) => group.repositories,
  );

  useEffect(() => {
    if (!isExactMatch) return;
    listRef.current
      ?.querySelector('[aria-selected="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [isExactMatch, normalized]);

  function pick(repo: GithubRepository) {
    onChange(repo.fullName);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    if (visibleRepositories.length === 0) return;
    event.preventDefault();
    const current = visibleRepositories.findIndex(
      (repo) => repo.fullName.toLowerCase() === normalized,
    );
    const step = event.key === "ArrowDown" ? 1 : -1;
    const next =
      current === -1
        ? step === 1
          ? 0
          : visibleRepositories.length - 1
        : (current + step + visibleRepositories.length) %
          visibleRepositories.length;
    pick(visibleRepositories[next]);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1.5">
        <Input
          id="repository"
          name="repository"
          placeholder={groups ? "Search or type owner/repo" : "owner/repo"}
          className="font-mono"
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          enterKeyHint="go"
          role="combobox"
          aria-expanded={Boolean(groups)}
          aria-controls="repository-list"
          required
          disabled={disabled}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        {groups || error ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
            disabled={disabled || loading}
            aria-label="Reload repositories"
            title="Reload repositories"
            onClick={reload}
          >
            {loading ? <Spinner /> : <RefreshCw />}
          </Button>
        ) : null}
      </div>

      {disabled ? null : loading && !groups ? (
        <div className="flex items-center gap-2 rounded-sm border border-border px-3 py-3 text-sm text-muted-foreground">
          <Spinner className="size-3.5" />
          Loading your repositories
        </div>
      ) : error ? (
        <p className="text-xs text-muted-foreground">{error}</p>
      ) : groups ? (
        <div
          ref={listRef}
          id="repository-list"
          role="listbox"
          aria-label="Your repositories"
          className="max-h-80 overflow-y-auto rounded-sm border border-border"
        >
          {visibleGroups.length === 0 ? (
            <p className="px-3 py-3 text-xs text-muted-foreground">
              {groups.length === 0
                ? "No repositories found on your account."
                : "No matches. Press Generate to use what you typed."}
            </p>
          ) : (
            visibleGroups.map((group) => (
              <div key={group.owner} role="group" aria-label={group.owner}>
                <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-background px-3 py-1.5">
                  <Avatar
                    className={cn(
                      "size-4",
                      group.isOrganization && "rounded-[3px]",
                    )}
                  >
                    <AvatarImage src={group.avatarUrl} alt="" />
                    <AvatarFallback className="text-[8px]">
                      {group.owner.slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate text-xs font-medium">
                    {group.owner}
                  </span>
                  <span className="ml-auto shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {group.isViewer
                      ? "You"
                      : group.isOrganization
                        ? "Org"
                        : "Collaborator"}
                  </span>
                </div>
                {group.repositories.map((repo) => {
                  const selected = repo.fullName.toLowerCase() === normalized;
                  return (
                    <button
                      key={repo.fullName}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      tabIndex={-1}
                      className={cn(
                        "flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-accent",
                        selected && "bg-accent font-medium",
                      )}
                      onClick={() => pick(repo)}
                    >
                      <span className="min-w-0 truncate font-mono">
                        {repo.name}
                      </span>
                      {repo.private ? (
                        <Lock
                          aria-label="Private"
                          className="size-3 shrink-0 text-muted-foreground"
                        />
                      ) : null}
                      <span className="ml-auto flex shrink-0 items-center gap-1 tabular-nums text-muted-foreground">
                        <Star className="size-3" aria-hidden />
                        {compactNumber.format(repo.stars)}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
