import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export interface GithubSyncSummary {
  status: "success" | "error";
  imported: number;
  updated: number;
  hidden: number;
  total: number;
  error?: string;
  startedAt: string;
  finishedAt: string;
}

async function runGithubSync(): Promise<GithubSyncSummary> {
  const startedAt = new Date().toISOString();
  const { getSupabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { listMyRepos, getRepoReadme, getRepoLanguages } = await import("./github-client.server");

  const topic = (process.env.GITHUB_PORTFOLIO_TOPIC ?? "portfolio").toLowerCase();
  const db = getSupabaseAdmin();

  let imported = 0, updated = 0, hidden = 0, total = 0;
  let status: "success" | "error" = "success";
  let errorMsg: string | undefined;

  try {
    const allRepos = await listMyRepos();
    const matching = allRepos.filter((r) => !r.archived && (r.topics ?? []).map((t) => t.toLowerCase()).includes(topic));
    total = matching.length;

    // Récupère les projets GitHub existants
    const { data: existingData } = await db
      .from("projects").select("id, source_id, hidden").eq("source", "github");
    const existing = (existingData ?? []) as Array<{ id: string; source_id: string | null; hidden: boolean }>;

    const existingMap = new Map(existing.map((p) => [p.source_id, p]));
    const matchedSourceIds = new Set(matching.map((r) => String(r.id)));

    // Masque les projets qui ne matchent plus
    for (const e of existing) {
      if (e.source_id && !matchedSourceIds.has(e.source_id) && !e.hidden) {
        await db.from("projects").update({ hidden: true }).eq("id", e.id);
        hidden++;
      }
    }

    // Upsert chaque repo qui matche
    for (const repo of matching) {
      const readme = await getRepoReadme(repo.full_name);
      const languages = await getRepoLanguages(repo.full_name);

      const payload = {
        name: repo.name,
        description: repo.description ?? "",
        source: "github" as const,
        source_id: String(repo.id),
        source_url: repo.html_url,
        homepage: repo.homepage,
        readme,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        hidden: false,
        last_synced_at: new Date().toISOString(),
        category: repo.language ?? "Code",
      };

      const exist = existingMap.get(String(repo.id));
      let projectId: string;
      if (exist) {
        const { data, error } = await db.from("projects").update(payload).eq("id", exist.id).select("id").single();
        if (error) throw error;
        projectId = data!.id;
        updated++;
      } else {
        const { data, error } = await db.from("projects").insert({
          ...payload, status: "active", priority: "medium",
        }).select("id").single();
        if (error) throw error;
        projectId = data!.id;
        imported++;
      }

      // Liens : repo + homepage
      await db.from("project_links").delete().eq("project_id", projectId).in("kind", ["repo", "demo"]);
      await db.from("project_links").insert({
        project_id: projectId, kind: "repo", label: "GitHub", url: repo.html_url,
      });
      if (repo.homepage) {
        await db.from("project_links").insert({
          project_id: projectId, kind: "demo", label: "Démo live", url: repo.homepage,
        });
      }

      // Tags : langages
      for (const lang of languages.slice(0, 6)) {
        const { data: tag } = await db.from("tags").upsert({ name: lang, color: "#00f0ff" }, { onConflict: "name" })
          .select("id").single();
        if (tag) {
          await db.from("project_tags").upsert({ project_id: projectId, tag_id: tag.id });
        }
      }
    }
  } catch (err) {
    status = "error";
    errorMsg = err instanceof Error ? err.message : String(err);
  }

  const finishedAt = new Date().toISOString();

  try {
    await db.from("sync_runs").insert({
      source: "github", status, imported, updated, hidden,
      error: errorMsg ?? null, started_at: startedAt, finished_at: finishedAt,
    });
  } catch { /* ignore log error */ }

  return { status, imported, updated, hidden, total, error: errorMsg, startedAt, finishedAt };
}

export const syncGithubProjects = createServerFn({ method: "POST" })
  .inputValidator(z.object({}).optional())
  .handler(runGithubSync);

// Réutilisé par la route cron
export { runGithubSync };
