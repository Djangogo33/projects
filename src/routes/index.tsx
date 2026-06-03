import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { CreateProjectDialog } from "@/components/create-project-dialog";
import { useEffect, useMemo, useState } from "react";
import { projectStorage, taskStorage } from "@/lib/storage";
import type { Project } from "@/lib/types";
import { Sparkles, Plus, Search, Calendar, Layers, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nebula — Tous tes projets" },
      { name: "description", content: "Tableau de bord de tous tes projets gérés avec IA." },
    ],
  }),
  component: Dashboard,
});

const STATUS_LABELS: Record<Project["status"], string> = {
  planning: "Planification",
  active: "Actif",
  paused: "En pause",
  completed: "Terminé",
  archived: "Archivé",
};

const STATUS_STYLES: Record<Project["status"], string> = {
  planning: "bg-cyan/10 text-cyan border-cyan/30",
  active: "bg-neon/10 text-neon border-neon/30",
  paused: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
  completed: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
  archived: "bg-muted text-muted-foreground border-border",
};

const PRIORITY_LABELS: Record<Project["priority"], string> = {
  low: "•",
  medium: "••",
  high: "•••",
  critical: "!!",
};

function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [taskCounts, setTaskCounts] = useState<Record<string, { total: number; done: number }>>({});

  useEffect(() => {
    const refresh = () => {
      const all = projectStorage.getAll();
      setProjects(all);
      const counts: Record<string, { total: number; done: number }> = {};
      for (const p of all) {
        const tasks = taskStorage.getByProject(p.id);
        counts[p.id] = { total: tasks.length, done: tasks.filter((t) => t.status === "done").length };
      }
      setTaskCounts(counts);
    };
    refresh();
    window.addEventListener("pm:refresh", refresh);
    return () => window.removeEventListener("pm:refresh", refresh);
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return projects;
    return projects.filter(
      (p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
    );
  }, [projects, search]);

  const stats = useMemo(() => {
    const total = projects.length;
    const active = projects.filter((p) => p.status === "active").length;
    const allTasks = Object.values(taskCounts);
    const tasksTotal = allTasks.reduce((a, b) => a + b.total, 0);
    const tasksDone = allTasks.reduce((a, b) => a + b.done, 0);
    return { total, active, tasksTotal, tasksDone };
  }, [projects, taskCounts]);

  return (
    <AppShell onCreateProject={() => setCreateOpen(true)}>
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {/* Header */}
        <div className="px-8 py-10 border-b border-border relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -z-0" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl -z-0" />

          <div className="relative">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">
                  Tableau de bord
                </p>
                <h1 className="text-4xl font-bold tracking-tight text-foreground">
                  Tes projets, <span className="bg-gradient-to-r from-primary via-accent to-cyan bg-clip-text text-transparent">propulsés par l'IA</span>
                </h1>
                <p className="mt-2 text-muted-foreground max-w-xl">
                  Crée, organise et avance sur tes projets avec un assistant IA dédié pour chacun.
                </p>
              </div>
              <Button onClick={() => setCreateOpen(true)} size="lg" className="bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg shadow-primary/20">
                <Plus className="w-4 h-4" />
                Nouveau projet
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
              <StatCard icon={Layers} label="Projets" value={stats.total} accent="text-primary" />
              <StatCard icon={TrendingUp} label="Actifs" value={stats.active} accent="text-neon" />
              <StatCard icon={Sparkles} label="Tâches" value={stats.tasksTotal} accent="text-cyan" />
              <StatCard icon={Calendar} label="Terminées" value={stats.tasksDone} accent="text-emerald-500" />
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="px-8 py-6 flex gap-3 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un projet..."
              className="pl-9 bg-surface border-border"
            />
          </div>
        </div>

        {/* Grid */}
        <div className="px-8 pb-12">
          {filtered.length === 0 ? (
            <EmptyState onCreate={() => setCreateOpen(true)} hasProjects={projects.length > 0} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((p) => {
                const counts = taskCounts[p.id] ?? { total: 0, done: 0 };
                const progress = counts.total > 0 ? (counts.done / counts.total) * 100 : 0;
                return (
                  <Link
                    key={p.id}
                    to="/projects/$projectId"
                    params={{ projectId: p.id }}
                    className="group relative gradient-border rounded-xl p-5 hover:scale-[1.02] transition-transform"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <span className={cn("text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border", STATUS_STYLES[p.status])}>
                        {STATUS_LABELS[p.status]}
                      </span>
                      <span className="text-xs font-mono text-muted-foreground" title={`Priorité ${p.priority}`}>
                        {PRIORITY_LABELS[p.priority]}
                      </span>
                    </div>

                    <h3 className="text-lg font-semibold text-foreground mb-1 group-hover:text-primary transition-colors line-clamp-1">
                      {p.name}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4 min-h-[2.5rem]">
                      {p.description || "Aucune description"}
                    </p>

                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                      <span className="font-mono">{p.category}</span>
                      <span>{counts.done}/{counts.total} tâches</span>
                    </div>

                    <div className="h-1 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-cyan transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    {p.deadline && (
                      <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(p.deadline).toLocaleDateString("fr-FR")}</span>
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} />
    </AppShell>
  );
}

function StatCard({ icon: Icon, label, value, accent }: { icon: typeof Sparkles; label: string; value: number; accent: string }) {
  return (
    <div className="glass rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <Icon className={cn("w-4 h-4", accent)} />
      </div>
      <div className="text-2xl font-bold text-foreground font-mono">{value}</div>
      <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{label}</div>
    </div>
  );
}

function EmptyState({ onCreate, hasProjects }: { onCreate: () => void; hasProjects: boolean }) {
  return (
    <div className="text-center py-20">
      <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 items-center justify-center mb-4">
        <Sparkles className="w-8 h-8 text-primary" />
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-2">
        {hasProjects ? "Aucun projet trouvé" : "Crée ton premier projet"}
      </h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        {hasProjects
          ? "Essaie un autre terme de recherche."
          : "Lance-toi avec un projet et laisse l'assistant IA t'aider à le découper et le piloter."}
      </p>
      {!hasProjects && (
        <Button onClick={onCreate} size="lg" className="bg-gradient-to-r from-primary to-accent">
          <Plus className="w-4 h-4" />
          Créer un projet
        </Button>
      )}
    </div>
  );
}
