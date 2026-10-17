import { Octokit } from "@octokit/rest";

export type GithubRepository = {
  fullName: string;
  name: string;
  owner: string;
  ownerAvatarUrl: string;
  ownerIsOrganization: boolean;
  private: boolean;
  stars: number;
};

export type GithubRepositoryGroup = {
  owner: string;
  avatarUrl: string;
  isOrganization: boolean;
  isViewer: boolean;
  repositories: GithubRepository[];
};

export type GithubRepositoriesResult =
  | { ok: true; groups: GithubRepositoryGroup[] }
  | { ok: false; message: string };

// Enough for almost everyone, without letting a huge account stall the form.
const maxPages = 10;

export async function getGithubRepositories(
  token: string,
): Promise<GithubRepositoriesResult> {
  const octokit = new Octokit({
    auth: token,
    request: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) =>
        fetch(input, { ...init, next: { revalidate: 0 } }),
    },
  });

  try {
    const [{ data: viewer }, { data: orgs }] = await Promise.all([
      octokit.users.getAuthenticated(),
      octokit.orgs.listForAuthenticatedUser({ per_page: 100 }),
    ]);

    // Owned, collaborator and organization-member repos, public and private.
    const repos: Awaited<
      ReturnType<typeof octokit.repos.listForAuthenticatedUser>
    >["data"] = [];
    for (let page = 1; page <= maxPages; page++) {
      const { data } = await octokit.repos.listForAuthenticatedUser({
        affiliation: "owner,collaborator,organization_member",
        visibility: "all",
        sort: "pushed",
        per_page: 100,
        page,
      });
      repos.push(...data);
      if (data.length < 100) break;
    }

    const groups = new Map<string, GithubRepositoryGroup>();
    const ensureGroup = (
      owner: string,
      avatarUrl: string,
      isOrganization: boolean,
    ) => {
      const key = owner.toLowerCase();
      let group = groups.get(key);
      if (!group) {
        group = {
          owner,
          avatarUrl,
          isOrganization,
          isViewer: key === viewer.login.toLowerCase(),
          repositories: [],
        };
        groups.set(key, group);
      }
      return group;
    };

    ensureGroup(viewer.login, viewer.avatar_url, false);
    for (const org of orgs) {
      ensureGroup(org.login, org.avatar_url, true);
    }

    for (const repo of repos) {
      const isOrganization = repo.owner.type === "Organization";
      ensureGroup(
        repo.owner.login,
        repo.owner.avatar_url,
        isOrganization,
      ).repositories.push({
        fullName: repo.full_name,
        name: repo.name,
        owner: repo.owner.login,
        ownerAvatarUrl: repo.owner.avatar_url,
        ownerIsOrganization: isOrganization,
        private: repo.private,
        stars: repo.stargazers_count,
      });
    }

    // Your own repos first, then organizations, then repos you collaborate on.
    const rank = (group: GithubRepositoryGroup) =>
      group.isViewer ? 0 : group.isOrganization ? 1 : 2;

    return {
      ok: true,
      groups: [...groups.values()]
        .filter((group) => group.repositories.length > 0)
        .sort(
          (a, b) =>
            rank(a) - rank(b) ||
            a.owner.localeCompare(b.owner, undefined, { sensitivity: "base" }),
        ),
    };
  } catch (err) {
    console.error("[github] Failed to list repositories:", err);
    const status =
      err && typeof err === "object" && "status" in err
        ? (err as { status: number }).status
        : undefined;
    return {
      ok: false,
      message:
        status === 401
          ? "Your GitHub session expired. Sign out and sign in again."
          : "Couldn't load your repositories. You can still type owner/repo.",
    };
  }
}
