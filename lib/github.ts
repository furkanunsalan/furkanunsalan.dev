const GITHUB_API = "https://api.github.com";
const GITHUB_GRAPHQL = "https://api.github.com/graphql";

export type GithubRepo = {
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  topics: string[];
  fork: boolean;
  archived: boolean;
  pushed_at: string;
  default_branch: string;
  owner: string;
};

export type ContributionLevel = 0 | 1 | 2 | 3 | 4;

export type ContributionDay = {
  date: string; // YYYY-MM-DD
  count: number;
  level: ContributionLevel;
};

export type ContributionCalendar = {
  total: number;
  weeks: { days: ContributionDay[] }[];
};

// A day carrying both accounts' activity, aligned on the same date grid.
export type MergedDay = {
  date: string;
  personal: number;
  personalLevel: ContributionLevel;
  work: number;
  workLevel: ContributionLevel;
};

export type MergedContributions = {
  totalPersonal: number;
  totalWork: number;
  weeks: { days: MergedDay[] }[];
};

const githubUser = process.env.GITHUB_USERNAME || "furkanunsalan";
const githubWorkUser =
  process.env.GITHUB_USERNAME_WORK || "furkanunsalan-teachfluence";

function authHeaders(extra: Record<string, string> = {}) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN is not configured");
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    ...extra,
  };
}

export async function getGithubRepos(): Promise<GithubRepo[]> {
  const url = `${GITHUB_API}/users/${githubUser}/repos?per_page=100&type=owner&sort=updated`;
  const res = await fetch(url, {
    headers: authHeaders(),
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`GitHub repos fetch failed: ${res.status}`);

  const raw = (await res.json()) as Array<{
    name: string;
    full_name: string;
    description: string | null;
    html_url: string;
    homepage: string | null;
    stargazers_count: number;
    forks_count: number;
    language: string | null;
    topics?: string[];
    fork: boolean;
    archived: boolean;
    pushed_at: string;
    default_branch: string;
    owner: { login: string };
  }>;

  return raw
    .filter((r) => !r.fork && !r.archived)
    .map((r) => ({
      name: r.name,
      full_name: r.full_name,
      description: r.description,
      html_url: r.html_url,
      homepage: r.homepage,
      stargazers_count: r.stargazers_count,
      forks_count: r.forks_count,
      language: r.language,
      topics: r.topics ?? [],
      fork: r.fork,
      archived: r.archived,
      pushed_at: r.pushed_at,
      default_branch: r.default_branch,
      owner: r.owner.login,
    }))
    .sort((a, b) => b.stargazers_count - a.stargazers_count);
}

export async function getGithubRepo(name: string): Promise<GithubRepo | null> {
  const url = `${GITHUB_API}/repos/${githubUser}/${name}`;
  const res = await fetch(url, {
    headers: authHeaders(),
    next: { revalidate: 3600 },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub repo fetch failed: ${res.status}`);

  const r = await res.json();
  return {
    name: r.name,
    full_name: r.full_name,
    description: r.description,
    html_url: r.html_url,
    homepage: r.homepage,
    stargazers_count: r.stargazers_count,
    forks_count: r.forks_count,
    language: r.language,
    topics: r.topics ?? [],
    fork: r.fork,
    archived: r.archived,
    pushed_at: r.pushed_at,
    default_branch: r.default_branch,
    owner: r.owner.login,
  };
}

// Last ~52 weeks of weekly commit totals for a single repo, for sparklines.
// Returns [] on any failure or while GitHub is still computing the stats (a 202
// with no usable body), so the caller simply renders no sparkline that round.
export async function getRepoCommitActivity(
  owner: string,
  name: string,
): Promise<number[]> {
  try {
    const url = `${GITHUB_API}/repos/${owner}/${name}/stats/commit_activity`;
    const res = await fetch(url, {
      headers: authHeaders(),
      next: { revalidate: 21600 },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as unknown;
    if (!Array.isArray(data)) return [];
    return data.map((w: any) => (typeof w?.total === "number" ? w.total : 0));
  } catch {
    return [];
  }
}

export async function getGithubReadme(
  owner: string,
  repo: string,
  branch: string,
): Promise<string> {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/README.md`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) return "";

  let markdown = await res.text();
  // Resolve relative image paths to raw GitHub URLs
  markdown = markdown.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    (match, alt, src) => {
      if (/^https?:\/\//.test(src)) return match;
      const base = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}`;
      return `![${alt}](${base}${src.startsWith("/") ? "" : "/"}${src})`;
    },
  );
  return markdown;
}

function levelFor(count: number): ContributionLevel {
  if (count === 0) return 0;
  if (count < 3) return 1;
  if (count < 6) return 2;
  if (count < 10) return 3;
  return 4;
}

// Fetch one account's calendar. Private contributions are included per-day only
// when the token belongs to `login` (GitHub restricts private day-data to the
// account owner), so callers pass each account its own token.
async function fetchContributionCalendar(
  login: string,
  token: string,
): Promise<ContributionCalendar> {
  const query = `
    query($login: String!) {
      user(login: $login) {
        contributionsCollection {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                date
                contributionCount
              }
            }
          }
        }
      }
    }
  `;

  const res = await fetch(GITHUB_GRAPHQL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables: { login } }),
    next: { revalidate: 3600 },
  });

  if (!res.ok)
    throw new Error(`GitHub GraphQL failed for ${login}: ${res.status}`);

  const json = await res.json();
  if (json.errors) {
    throw new Error(
      `GitHub GraphQL errors for ${login}: ${JSON.stringify(json.errors).slice(0, 200)}`,
    );
  }

  const cal = json.data.user.contributionsCollection.contributionCalendar;
  return {
    total: cal.totalContributions,
    weeks: cal.weeks.map((w: any) => ({
      days: w.contributionDays.map((d: any) => ({
        date: d.date,
        count: d.contributionCount,
        level: levelFor(d.contributionCount),
      })),
    })),
  };
}

// Personal + work calendars overlaid on one date grid. The personal grid is
// authoritative for the rendered cells; work counts are matched in by date.
// Work fetch failures degrade to a personal-only graph rather than 500-ing.
export async function getMergedContributions(): Promise<MergedContributions> {
  const personalToken = process.env.GITHUB_TOKEN;
  if (!personalToken) throw new Error("GITHUB_TOKEN is not configured");
  // No dedicated work token → query the work account with the personal token,
  // which sees its PUBLIC contributions only (private won't be counted).
  const workToken = process.env.GITHUB_TOKEN_WORK || personalToken;

  const personal = await fetchContributionCalendar(githubUser, personalToken);

  let work: ContributionCalendar | null = null;
  try {
    work = await fetchContributionCalendar(githubWorkUser, workToken);
  } catch (e) {
    console.error("[contributions] work calendar fetch failed:", e);
  }

  const workByDate = new Map<string, ContributionDay>();
  if (work) {
    for (const week of work.weeks) {
      for (const day of week.days) workByDate.set(day.date, day);
    }
  }

  const weeks = personal.weeks.map((week) => ({
    days: week.days.map((day) => {
      const w = workByDate.get(day.date);
      return {
        date: day.date,
        personal: day.count,
        personalLevel: day.level,
        work: w?.count ?? 0,
        workLevel: w?.level ?? 0,
      };
    }),
  }));

  return {
    totalPersonal: personal.total,
    totalWork: work?.total ?? 0,
    weeks,
  };
}
