import { Link, useLocation } from "@tanstack/react-router";
import { LayoutGrid, Plus } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { projectStorage } from "@/lib/storage";
import type { Project } from "@/lib/types";
import { cn } from "@/lib/utils";
import logoMark from "@/assets/nebula-mark.png";

const STATUS_DOTS: Record<Project["status"], string> = {
  planning: "bg-cyan",
  active: "bg-neon",
  paused: "bg-yellow-500",
  completed: "bg-emerald-500",
  archived: "bg-muted-foreground",
};

export function AppShell({ children, onCreateProject }: { children: ReactNode; onCreateProject?: () => void }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const location = useLocation();

  useEffect(() => {
    const refresh = () => setProjects(projectStorage.getAll());
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("pm:refresh", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("pm:refresh", refresh);
    };
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="hidden md:flex w-72 flex-col border-r border-border bg-surface/50 backdrop-blur-xl">
        <div className="flex items-center gap-3 px-6 py-6 border-b border-border">
          <div className="relative w-9 h-9 rounded-lg flex items-center justify-center">
            <img src={logoMark} alt="Nebula" className="w-9 h-9 object-contain" width={36} height={36} />
            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-primary to-accent blur-md opacity-30 -z-10" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-foreground">Nebula</h1>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">AI Project Hub</p>
          </div>
        </div>

        <nav className="px-3 py-4">
          <Link
            to="/"
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
              location.pathname === "/"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <LayoutGrid className="w-4 h-4" />
            Tous les projets
            <span className="ml-auto text-xs font-mono text-muted-foreground">{projects.length}</span>
          </Link>
        </nav>

        <div className="px-6 pt-4 pb-2 flex items-center justify-between">
          <h2 className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono font-semibold">
            Projets
          </h2>
          {onCreateProject && (
            <button
              onClick={onCreateProject}
              className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              aria-label="Nouveau projet"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-3 pb-4 space-y-0.5">
          {projects.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground italic">Aucun projet</p>
          ) : (
            projects.map((p) => (
              <Link
                key={p.id}
                to="/projects/$projectId"
                params={{ projectId: p.id }}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors group",
                  location.pathname === `/projects/${p.id}`
                    ? "bg-primary/10 text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", STATUS_DOTS[p.status])} />
                <span className="truncate flex-1">{p.name}</span>
              </Link>
            ))
          )}
        </div>

        <div className="px-6 py-4 border-t border-border">
          <p className="text-[10px] text-muted-foreground font-mono">
            💾 Données stockées localement
          </p>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 flex flex-col">{children}</main>
    </div>
  );
}
