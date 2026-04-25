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

export type ContributionDay = {
  date: string; // YYYY-MM-DD
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
};

export type ContributionCalendar = {
  total: number;
  weeks: { days: ContributionDay[] }[];
};

const githubUser = process.env.GITHUB_USERNAME || "furkanunsalan";

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

function levelFor(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count === 0) return 0;
  if (count < 3) return 1;
  if (count < 6) return 2;
  if (count < 10) return 3;
  return 4;
}

export async function getContributionCalendar(): Promise<ContributionCalendar> {
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
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      query,
      variables: { login: githubUser },
    }),
    next: { revalidate: 3600 },
  });

  if (!res.ok) throw new Error(`GitHub GraphQL failed: ${res.status}`);

  const json = await res.json();
  if (json.errors) {
    throw new Error(
      `GitHub GraphQL errors: ${JSON.stringify(json.errors).slice(0, 200)}`,
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
