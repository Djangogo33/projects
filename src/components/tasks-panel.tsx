import { useState, useEffect } from "react";
import { taskStorage } from "@/lib/storage";
import type { Task, Priority, TaskStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "À faire",
  in_progress: "En cours",
  review: "Revue",
  done: "Terminé",
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  todo: "text-muted-foreground",
  in_progress: "text-cyan",
  review: "text-yellow-500",
  done: "text-emerald-500 line-through",
};

const PRIORITY_DOT: Record<Priority, string> = {
  low: "bg-muted-foreground",
  medium: "bg-cyan",
  high: "bg-yellow-500",
  critical: "bg-destructive",
};

export function TasksPanel({ projectId }: { projectId: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTitle, setNewTitle] = useState("");

  const refresh = () => setTasks(taskStorage.getByProject(projectId));
  useEffect(() => { refresh(); }, [projectId]);

  const addTask = () => {
    if (!newTitle.trim()) return;
    taskStorage.create({
      projectId,
      title: newTitle.trim(),
      description: "",
      status: "todo",
      priority: "medium",
      deadline: null,
      completedAt: null,
    });
    setNewTitle("");
    refresh();
  };

  const toggleDone = (task: Task) => {
    taskStorage.update(task.id, {
      status: task.status === "done" ? "todo" : "done",
      completedAt: task.status === "done" ? null : new Date().toISOString(),
    });
    refresh();
  };

  const updateStatus = (id: string, status: TaskStatus) => {
    taskStorage.update(id, {
      status,
      completedAt: status === "done" ? new Date().toISOString() : null,
    });
    refresh();
  };

  const updatePriority = (id: string, priority: Priority) => {
    taskStorage.update(id, { priority });
    refresh();
  };

  const deleteTask = (id: string) => {
    taskStorage.delete(id);
    refresh();
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <div className="flex gap-2">
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTask()}
          placeholder="Ajouter une tâche..."
          className="bg-surface"
        />
        <Button onClick={addTask} className="bg-gradient-to-r from-primary to-accent">
          <Plus className="w-4 h-4" />
          Ajouter
        </Button>
      </div>

      {tasks.length === 0 ? (
        <p className="text-center text-muted-foreground py-12 text-sm">
          Aucune tâche pour l'instant. Demande à l'IA de t'aider à découper ce projet !
        </p>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="group glass rounded-lg p-3 flex items-center gap-3 hover:border-primary/30 transition-colors"
            >
              <Checkbox
                checked={task.status === "done"}
                onCheckedChange={() => toggleDone(task)}
              />
              <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", PRIORITY_DOT[task.priority])} />
              <span className={cn("flex-1 text-sm", STATUS_COLORS[task.status])}>
                {task.title}
              </span>

              <Select value={task.priority} onValueChange={(v) => updatePriority(task.id, v as Priority)}>
                <SelectTrigger className="h-7 w-24 text-xs border-0 bg-transparent hover:bg-muted">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Faible</SelectItem>
                  <SelectItem value="medium">Moyen</SelectItem>
                  <SelectItem value="high">Haute</SelectItem>
                  <SelectItem value="critical">Critique</SelectItem>
                </SelectContent>
              </Select>

              <Select value={task.status} onValueChange={(v) => updateStatus(task.id, v as TaskStatus)}>
                <SelectTrigger className="h-7 w-28 text-xs border-0 bg-transparent hover:bg-muted">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <button
                onClick={() => deleteTask(task.id)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                aria-label="Supprimer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
