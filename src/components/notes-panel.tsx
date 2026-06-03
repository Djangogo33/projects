import { useState, useEffect } from "react";
import { noteStorage } from "@/lib/storage";
import type { Note } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";

export function NotesPanel({ projectId }: { projectId: string }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [content, setContent] = useState("");

  const refresh = () => setNotes(noteStorage.getByProject(projectId).reverse());
  useEffect(() => { refresh(); }, [projectId]);

  const addNote = () => {
    if (!content.trim()) return;
    noteStorage.create({ projectId, content: content.trim() });
    setContent("");
    refresh();
  };

  const deleteNote = (id: string) => {
    noteStorage.delete(id);
    refresh();
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <div className="glass rounded-lg p-4 space-y-3">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Note rapide, idée, lien, contexte..."
          rows={3}
          className="bg-surface/50 resize-none"
        />
        <div className="flex justify-end">
          <Button onClick={addNote} size="sm" className="bg-gradient-to-r from-primary to-accent">
            <Plus className="w-4 h-4" />
            Ajouter
          </Button>
        </div>
      </div>

      {notes.length === 0 ? (
        <p className="text-center text-muted-foreground py-12 text-sm">
          Aucune note pour l'instant.
        </p>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div key={note.id} className="group glass rounded-lg p-4 hover:border-primary/30 transition-colors">
              <div className="flex items-start justify-between gap-3 mb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  {new Date(note.createdAt).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}
                </span>
                <button
                  onClick={() => deleteNote(note.id)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                  aria-label="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap">{note.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
