import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputTextarea, PromptInputSubmit, PromptInputFooter } from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { projectStorage, taskStorage, noteStorage, messageStorage } from "@/lib/storage";
import type { Project } from "@/lib/types";
import { Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

function buildProjectContext(project: Project): string {
  const tasks = taskStorage.getByProject(project.id);
  const notes = noteStorage.getByProject(project.id);
  return `Nom: ${project.name}
Description: ${project.description || "(aucune)"}
Catégorie: ${project.category}
Statut: ${project.status}
Priorité: ${project.priority}
Deadline: ${project.deadline ?? "(aucune)"}

Tâches actuelles (${tasks.length}):
${tasks.map((t) => `- [${t.status}] ${t.title} (priorité: ${t.priority})`).join("\n") || "(aucune)"}

Notes (${notes.length}):
${notes.slice(-5).map((n) => `- ${n.content.substring(0, 100)}`).join("\n") || "(aucune)"}`;
}

function extractAndApply(content: string, projectId: string): { cleaned: string; applied: { tasks: number; notes: number } } {
  let applied = { tasks: 0, notes: 0 };
  let cleaned = content;

  const taskRegex = /\[TASK\]([\s\S]*?)\[\/TASK\]/g;
  let match;
  while ((match = taskRegex.exec(content)) !== null) {
    const title = match[1].trim();
    if (title) {
      taskStorage.create({
        projectId,
        title,
        description: "",
        status: "todo",
        priority: "medium",
        deadline: null,
        completedAt: null,
      });
      applied.tasks++;
    }
  }
  cleaned = cleaned.replace(taskRegex, "✅ Tâche créée : **$1**");

  const noteRegex = /\[NOTE\]([\s\S]*?)\[\/NOTE\]/g;
  while ((match = noteRegex.exec(content)) !== null) {
    const noteContent = match[1].trim();
    if (noteContent) {
      noteStorage.create({ projectId, content: noteContent });
      applied.notes++;
    }
  }
  cleaned = cleaned.replace(noteRegex, "📝 Note ajoutée");

  return { cleaned, applied };
}

const SUGGESTIONS = [
  "Découpe ce projet en tâches concrètes",
  "Fais-moi un résumé de l'état actuel",
  "Quelle est la prochaine action prioritaire ?",
  "Suggère un planning sur 2 semaines",
];

export function ProjectChat({ project }: { project: Project }) {
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const lastProcessedId = useRef<string | null>(null);

  useEffect(() => {
    const stored = messageStorage.getByProject(project.id);
    const ui: UIMessage[] = stored.map((m) => ({
      id: m.id,
      role: m.role,
      parts: [{ type: "text", text: m.content }],
    }));
    setInitialMessages(ui);
    setLoaded(true);
  }, [project.id]);

  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/chat" }), []);

  if (!loaded) return null;

  return <ChatInner project={project} initialMessages={initialMessages} transport={transport} lastProcessedId={lastProcessedId} />;
}

function ChatInner({
  project,
  initialMessages,
  transport,
  lastProcessedId,
}: {
  project: Project;
  initialMessages: UIMessage[];
  transport: DefaultChatTransport<UIMessage>;
  lastProcessedId: React.MutableRefObject<string | null>;
}) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { messages, sendMessage, status } = useChat({
    id: project.id,
    messages: initialMessages,
    transport,
    onError: (err) => {
      console.error(err);
      toast.error("Erreur de l'assistant : " + (err.message ?? "inconnue"));
    },
    onFinish: ({ message }) => {
      const text = message.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
      const { applied } = extractAndApply(text, project.id);
      if (applied.tasks > 0 || applied.notes > 0) {
        const parts: string[] = [];
        if (applied.tasks > 0) parts.push(`${applied.tasks} tâche${applied.tasks > 1 ? "s" : ""}`);
        if (applied.notes > 0) parts.push(`${applied.notes} note${applied.notes > 1 ? "s" : ""}`);
        toast.success(`✨ ${parts.join(" et ")} créée${applied.tasks + applied.notes > 1 ? "s" : ""}`);
        window.dispatchEvent(new Event("pm:refresh"));
      }
      messageStorage.create({
        projectId: project.id,
        role: "assistant",
        content: text,
      });
    },
  });

  // Persist user messages
  useEffect(() => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (lastUser && lastUser.id !== lastProcessedId.current) {
      const stored = messageStorage.getByProject(project.id);
      if (!stored.some((s) => s.id === lastUser.id)) {
        const text = lastUser.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
        messageStorage.create({
          projectId: project.id,
          role: "user",
          content: text,
        });
      }
      lastProcessedId.current = lastUser.id;
    }
  }, [messages, project.id, lastProcessedId]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [project.id, status]);

  const handleSubmit = (message: { text?: string }) => {
    const text = (message.text ?? input).trim();
    if (!text || status === "streaming" || status === "submitted") return;
    sendMessage(
      { text },
      {
        body: {
          projectId: project.id,
          projectContext: buildProjectContext(project),
        },
      }
    );
    setInput("");
  };

  const sendSuggestion = (text: string) => {
    if (status === "streaming" || status === "submitted") return;
    sendMessage(
      { text },
      {
        body: {
          projectId: project.id,
          projectContext: buildProjectContext(project),
        },
      }
    );
  };

  const isLoading = status === "submitted" || status === "streaming";

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto w-full">
      <Conversation className="flex-1">
        <ConversationContent className="px-6 py-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4 shadow-lg shadow-primary/30">
                <Sparkles className="w-7 h-7 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Assistant IA pour {project.name}</h3>
              <p className="text-sm text-muted-foreground max-w-md mb-6">
                Pose une question, demande un découpage en tâches, un résumé, ou laisse l'IA te guider.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                {SUGGESTIONS.map((s) => (
                  <Button
                    key={s}
                    variant="outline"
                    size="sm"
                    onClick={() => sendSuggestion(s)}
                    className="justify-start text-left text-xs font-normal h-auto py-2.5 px-3 bg-surface hover:bg-muted hover:border-primary/30"
                  >
                    <Wand2 className="w-3 h-3 mr-2 shrink-0 text-primary" />
                    <span className="truncate">{s}</span>
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message) => {
              const text = message.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
              const displayText = text
                .replace(/\[TASK\]([\s\S]*?)\[\/TASK\]/g, "✅ **$1**")
                .replace(/\[NOTE\]([\s\S]*?)\[\/NOTE\]/g, "📝 _$1_");
              return (
                <Message key={message.id} from={message.role}>
                  {message.role === "user" ? (
                    <MessageContent className="bg-primary text-primary-foreground">
                      <div className="whitespace-pre-wrap">{text}</div>
                    </MessageContent>
                  ) : (
                    <MessageResponse>{displayText}</MessageResponse>
                  )}
                </Message>
              );
            })
          )}
          {isLoading && (
            <div className="px-2 py-1">
              <Shimmer>Réflexion en cours...</Shimmer>
            </div>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="p-4 border-t border-border bg-background/50 backdrop-blur">
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputTextarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Demande à l'IA à propos de "${project.name}"...`}
            disabled={isLoading}
          />
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit status={status} disabled={!input.trim() || isLoading} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
