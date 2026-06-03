import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { projectStorage } from "@/lib/storage";
import type { Priority, ProjectStatus } from "@/lib/types";
import { Sparkles } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

export function CreateProjectDialog({
  open,
  onOpenChange,
  trigger,
}: {
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
  trigger?: React.ReactNode;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [status, setStatus] = useState<ProjectStatus>("planning");
  const [deadline, setDeadline] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const project = projectStorage.create({
      name: name.trim(),
      description: description.trim(),
      category: category.trim() || "Général",
      priority,
      status,
      deadline: deadline || null,
    });
    window.dispatchEvent(new Event("pm:refresh"));
    setName("");
    setDescription("");
    setCategory("");
    setDeadline("");
    onOpenChange?.(false);
    navigate({ to: "/projects/$projectId", params: { projectId: project.id } });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="glass-strong border-glass-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-4 h-4 text-primary" />
            Nouveau projet
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom du projet</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Mon super projet" autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Quel est l'objectif de ce projet ?" rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="category">Catégorie</Label>
              <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Pro, Perso..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deadline">Deadline</Label>
              <Input id="deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Priorité</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Faible</SelectItem>
                  <SelectItem value="medium">Moyenne</SelectItem>
                  <SelectItem value="high">Haute</SelectItem>
                  <SelectItem value="critical">Critique</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Statut</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as ProjectStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">Planification</SelectItem>
                  <SelectItem value="active">Actif</SelectItem>
                  <SelectItem value="paused">En pause</SelectItem>
                  <SelectItem value="completed">Terminé</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" className="bg-gradient-to-r from-primary to-accent hover:opacity-90">
              <Sparkles className="w-4 h-4" />
              Créer le projet
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
