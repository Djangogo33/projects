// Server-only GitHub client. Préfère GITHUB_TOKEN (PAT). Lit l'API publique en fallback.
const GITHUB_API = "https://api.github.com";

function getAuthHeader(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function gh<T>(path: string): Promise<T> {
  const res = await fetch(`${GITHUB_API}${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...getAuthHeader(),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GitHub ${res.status} ${path}: ${body.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

export interface GhRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  stargazers_count: number;
  forks_count: number;
  topics: string[];
  language: string | null;
  default_branch: string;
  archived: boolean;
  fork: boolean;
  private: boolean;
  pushed_at: string;
}

export async function listMyRepos(): Promise<GhRepo[]> {
  if (!process.env.GITHUB_TOKEN) {
    throw new Error("GITHUB_TOKEN manquant : impossible de lister tes repos privés sans auth.");
  }
  const repos: GhRepo[] = [];
  for (let page = 1; page <= 10; page++) {
    const batch = await gh<GhRepo[]>(`/user/repos?per_page=100&page=${page}&sort=updated`);
    repos.push(...batch);
    if (batch.length < 100) break;
  }
  return repos;
}

export async function getRepoReadme(fullName: string): Promise<string | null> {
  try {
    const r = await gh<{ content: string; encoding: string }>(`/repos/${fullName}/readme`);
    if (r.encoding === "base64") {
      // atob disponible sur Workers + Vercel Edge ; Buffer côté Node aussi
      try { return atob(r.content.replace(/\n/g, "")); }
      catch { return Buffer.from(r.content, "base64").toString("utf-8"); }
    }
    return r.content;
  } catch { return null; }
}

export async function getRepoLanguages(fullName: string): Promise<string[]> {
  try {
    const r = await gh<Record<string, number>>(`/repos/${fullName}/languages`);
    return Object.keys(r);
  } catch { return []; }
}
