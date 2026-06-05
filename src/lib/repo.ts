import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import type { DbProject, DbProjectLink, DbSyncRun, LinkKind, ProjectSource } from "./db-types";

export { isSupabaseConfigured };

// ============== PROJECTS (Supabase-backed) ==============

export async function listSyncedProjects(opts: { includeHidden?: boolean } = {}): Promise<DbProject[]> {
  if (!isSupabaseConfigured) return [];
  let q = supabase.from("projects").select("*").order("updated_at", { ascending: false });
  if (!opts.includeHidden) q = q.eq("hidden", false);
  const { data, error } = await q;
  if (error) {
    console.error("listSyncedProjects", error);
    return [];
  }
  return data ?? [];
}

export async function getSyncedProject(id: string): Promise<DbProject | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.from("projects").select("*").eq("id", id).maybeSingle();
  if (error) { console.error(error); return null; }
  return data;
}

export async function getProjectBySource(source: ProjectSource, sourceId: string): Promise<DbProject | null> {
  if (!isSupabaseConfigured) return null;
  const { data } = await supabase
    .from("projects").select("*")
    .eq("source", source).eq("source_id", sourceId).maybeSingle();
  return data ?? null;
}

export async function createProject(input: Partial<DbProject> & { name: string }): Promise<DbProject | null> {
  if (!isSupabaseConfigured) throw new Error("Supabase non configuré");
  const { data, error } = await supabase.from("projects").insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function updateProject(id: string, patch: Partial<DbProject>): Promise<void> {
  if (!isSupabaseConfigured) throw new Error("Supabase non configuré");
  const { error } = await supabase.from("projects").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteProject(id: string): Promise<void> {
  if (!isSupabaseConfigured) throw new Error("Supabase non configuré");
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw error;
}

// ============== PROJECT LINKS ==============

export async function listProjectLinks(projectId: string): Promise<DbProjectLink[]> {
  if (!isSupabaseConfigured) return [];
  const { data } = await supabase
    .from("project_links").select("*")
    .eq("project_id", projectId).order("created_at", { ascending: true });
  return data ?? [];
}

export async function addProjectLink(projectId: string, label: string, url: string, kind: LinkKind = "other"): Promise<void> {
  if (!isSupabaseConfigured) throw new Error("Supabase non configuré");
  const { error } = await supabase.from("project_links").insert({
    project_id: projectId, label, url, kind,
  });
  if (error) throw error;
}

export async function deleteProjectLink(id: string): Promise<void> {
  if (!isSupabaseConfigured) throw new Error("Supabase non configuré");
  const { error } = await supabase.from("project_links").delete().eq("id", id);
  if (error) throw error;
}

// ============== SYNC RUNS ==============

export async function getLastSyncRun(source: string): Promise<DbSyncRun | null> {
  if (!isSupabaseConfigured) return null;
  const { data } = await supabase
    .from("sync_runs").select("*").eq("source", source)
    .order("started_at", { ascending: false }).limit(1).maybeSingle();
  return data ?? null;
}

// ============== TAGS ==============

export async function listProjectTags(projectId: string): Promise<string[]> {
  if (!isSupabaseConfigured) return [];
  const { data } = await supabase
    .from("project_tags").select("tags(name)").eq("project_id", projectId);
  // @ts-expect-error nested type
  return (data ?? []).map((r) => r.tags?.name).filter(Boolean) as string[];
}
