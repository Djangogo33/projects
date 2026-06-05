-- Nebula — Schéma initial
-- Exécute ce fichier dans le SQL Editor de ton projet Supabase
-- (Dashboard → SQL Editor → New query → coller → Run).
--
-- Sécurité : l'app est mono-utilisateur ("solo"). Les policies ouvrent tout à
-- `anon` (clé publique du frontend). Si tu ajoutes l'auth plus tard, remplace
-- chaque `USING (true)` par un test sur auth.uid().

-- ============== ENUMS ==============
do $$ begin
  create type project_status as enum ('planning','active','paused','completed','archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type task_status as enum ('todo','in_progress','review','done');
exception when duplicate_object then null; end $$;

do $$ begin
  create type priority_level as enum ('low','medium','high','critical');
exception when duplicate_object then null; end $$;

do $$ begin
  create type project_source as enum ('manual','github','notion','import');
exception when duplicate_object then null; end $$;

do $$ begin
  create type link_kind as enum ('demo','docs','repo','design','other');
exception when duplicate_object then null; end $$;

-- ============== PROJECTS ==============
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  status project_status not null default 'planning',
  priority priority_level not null default 'medium',
  category text not null default '',
  deadline date,
  source project_source not null default 'manual',
  source_id text,
  source_url text,
  readme text,
  stars integer not null default 0,
  forks integer not null default 0,
  homepage text,
  hidden boolean not null default false,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, source_id)
);
create index if not exists projects_source_idx on public.projects (source);
create index if not exists projects_hidden_idx on public.projects (hidden);
grant select, insert, update, delete on public.projects to anon, authenticated;
grant all on public.projects to service_role;
alter table public.projects enable row level security;
drop policy if exists "solo all" on public.projects;
create policy "solo all" on public.projects for all to anon, authenticated using (true) with check (true);

-- ============== TAGS ==============
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text not null default '#888888',
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.tags to anon, authenticated;
grant all on public.tags to service_role;
alter table public.tags enable row level security;
drop policy if exists "solo all" on public.tags;
create policy "solo all" on public.tags for all to anon, authenticated using (true) with check (true);

-- ============== PROJECT_TAGS ==============
create table if not exists public.project_tags (
  project_id uuid not null references public.projects(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (project_id, tag_id)
);
grant select, insert, update, delete on public.project_tags to anon, authenticated;
grant all on public.project_tags to service_role;
alter table public.project_tags enable row level security;
drop policy if exists "solo all" on public.project_tags;
create policy "solo all" on public.project_tags for all to anon, authenticated using (true) with check (true);

-- ============== PROJECT_LINKS ==============
create table if not exists public.project_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  label text not null,
  url text not null,
  kind link_kind not null default 'other',
  created_at timestamptz not null default now()
);
create index if not exists project_links_project_idx on public.project_links (project_id);
grant select, insert, update, delete on public.project_links to anon, authenticated;
grant all on public.project_links to service_role;
alter table public.project_links enable row level security;
drop policy if exists "solo all" on public.project_links;
create policy "solo all" on public.project_links for all to anon, authenticated using (true) with check (true);

-- ============== TASKS ==============
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text not null default '',
  status task_status not null default 'todo',
  priority priority_level not null default 'medium',
  deadline date,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists tasks_project_idx on public.tasks (project_id);
grant select, insert, update, delete on public.tasks to anon, authenticated;
grant all on public.tasks to service_role;
alter table public.tasks enable row level security;
drop policy if exists "solo all" on public.tasks;
create policy "solo all" on public.tasks for all to anon, authenticated using (true) with check (true);

-- ============== NOTES ==============
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists notes_project_idx on public.notes (project_id);
grant select, insert, update, delete on public.notes to anon, authenticated;
grant all on public.notes to service_role;
alter table public.notes enable row level security;
drop policy if exists "solo all" on public.notes;
create policy "solo all" on public.notes for all to anon, authenticated using (true) with check (true);

-- ============== MESSAGES ==============
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists messages_project_idx on public.messages (project_id, created_at);
grant select, insert, update, delete on public.messages to anon, authenticated;
grant all on public.messages to service_role;
alter table public.messages enable row level security;
drop policy if exists "solo all" on public.messages;
create policy "solo all" on public.messages for all to anon, authenticated using (true) with check (true);

-- ============== SYNC_RUNS ==============
create table if not exists public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  status text not null,
  imported integer not null default 0,
  updated integer not null default 0,
  hidden integer not null default 0,
  error text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists sync_runs_source_started_idx on public.sync_runs (source, started_at desc);
grant select, insert, update, delete on public.sync_runs to anon, authenticated;
grant all on public.sync_runs to service_role;
alter table public.sync_runs enable row level security;
drop policy if exists "solo all" on public.sync_runs;
create policy "solo all" on public.sync_runs for all to anon, authenticated using (true) with check (true);

-- ============== Trigger updated_at ==============
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists projects_touch on public.projects;
create trigger projects_touch before update on public.projects
  for each row execute function public.touch_updated_at();

drop trigger if exists notes_touch on public.notes;
create trigger notes_touch before update on public.notes
  for each row execute function public.touch_updated_at();
