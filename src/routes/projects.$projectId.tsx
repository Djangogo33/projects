import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { projectStorage } from "@/lib/storage";
import type { Project, ProjectStatus, Priority } from "@/lib/types";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Trash2, ArrowLeft, Calendar, Layers, FileText, MessageSquare } from "lucide-react";
import { TasksPanel } from "@/components/tasks-panel";
import { NotesPanel } from "@/components/notes-panel";
import { ProjectChat } from "@/components/project-chat";
import { cn } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/projects/$projectId")({
  head: () => ({
    meta: [
      { title: "Projet — Nebula" },
      { name: "description", content: "Détail d'un projet avec son assistant IA dédié." },
    ],
  }),
  component: ProjectDetail,
});

const STATUS_LABELS: Record<ProjectStatus, string> = {
  planning: "Planification",
  active: "Actif",
  paused: "En pause",
  completed: "Terminé",
  archived: "Archivé",
};

function ProjectDetail() {
  const { projectId } = Route.useParams();
  const navigate = useNavigate();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [tab, setTab] = useState("chat");

  useEffect(() => {
    const p = projectStorage.getById(projectId);
    if (!p) {
      navigate({ to: "/" });
      return;
    }
    setProject(p);
  }, [projectId, navigate]);

  if (!project) return null;

  const update = (updates: Partial<Project>) => {
    const updated = projectStorage.update(project.id, updates);
    if (updated) {
      setProject(updated);
      window.dispatchEvent(new Event("pm:refresh"));
    }
  };

  const handleDelete = () => {
    projectStorage.delete(project.id);
    window.dispatchEvent(new Event("pm:refresh"));
    navigate({ to: "/" });
  };

  return (
    <AppShell>
      <div className="flex flex-col h-screen">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-surface/30 backdrop-blur-xl">
          <div className="flex items-center gap-3 mb-3">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => router.navigate({ to: "/" })}
              className="md:hidden"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <Input
              value={project.name}
              onChange={(e) => update({ name: e.target.value })}
              className="text-xl font-bold border-0 bg-transparent px-0 h-auto focus-visible:ring-0 shadow-none"
            />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer ce projet ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action est irréversible. Toutes les tâches, notes et conversations seront supprimées.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                    Supprimer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Select value={project.status} onValueChange={(v) => update({ status: v as ProjectStatus })}>
              <SelectTrigger className="h-7 w-36 bg-surface text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={project.priority} onValueChange={(v) => update({ priority: v as Priority })}>
              <SelectTrigger className="h-7 w-32 bg-surface text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Faible</SelectItem>
                <SelectItem value="medium">Moyenne</SelectItem>
                <SelectItem value="high">Haute</SelectItem>
                <SelectItem value="critical">Critique</SelectItem>
              </SelectContent>
            </Select>
            <Input
              value={project.category}
              onChange={(e) => update({ category: e.target.value })}
              placeholder="Catégorie"
              className="h-7 w-32 bg-surface text-xs"
            />
            <div className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" />
              <Input
                type="date"
                value={project.deadline ?? ""}
                onChange={(e) => update({ deadline: e.target.value || null })}
                className="h-7 w-36 bg-surface text-xs"
              />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col min-h-0">
          <div className="px-6 pt-3 border-b border-border bg-background">
            <TabsList className="bg-transparent h-auto p-0 gap-1">
              <TabIcon value="chat" icon={MessageSquare} label="Assistant IA" />
              <TabIcon value="tasks" icon={Layers} label="Tâches" />
              <TabIcon value="notes" icon={FileText} label="Notes" />
              <TabIcon value="overview" icon={Sparkles} label="Aperçu" />
            </TabsList>
          </div>

          <div className="flex-1 min-h-0 overflow-hidden">
            <TabsContent value="chat" className="h-full m-0 data-[state=active]:flex flex-col">
              <ProjectChat project={project} />
            </TabsContent>
            <TabsContent value="tasks" className="h-full m-0 overflow-y-auto scrollbar-thin">
              <TasksPanel projectId={project.id} />
            </TabsContent>
            <TabsContent value="notes" className="h-full m-0 overflow-y-auto scrollbar-thin">
              <NotesPanel projectId={project.id} />
            </TabsContent>
            <TabsContent value="overview" className="h-full m-0 overflow-y-auto scrollbar-thin">
              <div className="max-w-3xl mx-auto p-6 space-y-4">
                <div className="glass rounded-lg p-5">
                  <label className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-2 block">
                    Description
                  </label>
                  <Textarea
                    value={project.description}
                    onChange={(e) => update({ description: e.target.value })}
                    placeholder="Décris ton projet..."
                    rows={6}
                    className="bg-surface/50 resize-none"
                  />
                </div>
                <div className="glass rounded-lg p-5 text-sm text-muted-foreground space-y-1 font-mono">
                  <div>Créé le {new Date(project.createdAt).toLocaleString("fr-FR")}</div>
                  <div>Modifié le {new Date(project.updatedAt).toLocaleString("fr-FR")}</div>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </AppShell>
  );
}

function TabIcon({ value, icon: Icon, label }: { value: string; icon: typeof Sparkles; label: string }) {
  return (
    <TabsTrigger
      value={value}
      className={cn(
        "rounded-md px-4 py-2 text-sm font-medium data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none",
        "data-[state=inactive]:text-muted-foreground hover:text-foreground"
      )}
    >
      <Icon className="w-4 h-4 mr-2" />
      {label}
    </TabsTrigger>
  );
}
