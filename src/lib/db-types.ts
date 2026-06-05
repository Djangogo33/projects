// Types simplifiés du schéma DB. Pour générer la version complète :
//   supabase gen types typescript --project-id YOUR_REF --schema public > src/lib/db-types.ts

export type ProjectStatus = "planning" | "active" | "paused" | "completed" | "archived";
export type TaskStatus = "todo" | "in_progress" | "review" | "done";
export type Priority = "low" | "medium" | "high" | "critical";
export type ProjectSource = "manual" | "github" | "notion" | "import";
export type LinkKind = "demo" | "docs" | "repo" | "design" | "other";

export interface DbProject {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  priority: Priority;
  category: string;
  deadline: string | null;
  source: ProjectSource;
  source_id: string | null;
  source_url: string | null;
  readme: string | null;
  stars: number;
  forks: number;
  homepage: string | null;
  hidden: boolean;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbTask {
  id: string;
  project_id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  deadline: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface DbNote {
  id: string;
  project_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface DbMessage {
  id: string;
  project_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
}

export interface DbTag {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface DbProjectTag {
  project_id: string;
  tag_id: string;
}

export interface DbProjectLink {
  id: string;
  project_id: string;
  label: string;
  url: string;
  kind: LinkKind;
  created_at: string;
}

export interface DbSyncRun {
  id: string;
  source: string;
  status: string;
  imported: number;
  updated: number;
  hidden: number;
  error: string | null;
  started_at: string;
  finished_at: string | null;
}

type TableShape<Row> = { Row: Row; Insert: Partial<Row>; Update: Partial<Row> };

export interface Database {
  public: {
    Tables: {
      projects: TableShape<DbProject>;
      tasks: TableShape<DbTask>;
      notes: TableShape<DbNote>;
      messages: TableShape<DbMessage>;
      tags: TableShape<DbTag>;
      project_tags: TableShape<DbProjectTag>;
      project_links: TableShape<DbProjectLink>;
      sync_runs: TableShape<DbSyncRun>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      project_status: ProjectStatus;
      task_status: TaskStatus;
      priority_level: Priority;
      project_source: ProjectSource;
      link_kind: LinkKind;
    };
  };
}
