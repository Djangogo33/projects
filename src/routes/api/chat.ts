import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

type ChatRequestBody = { messages?: unknown; projectId?: string; projectContext?: string };

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages, projectId, projectContext } = (await request.json()) as ChatRequestBody;
        if (!Array.isArray(messages)) {
          return new Response("Messages are required", { status: 400 });
        }

        const key = process.env.LOVABLE_API_KEY;
        if (!key) {
          return new Response("Missing LOVABLE_API_KEY", { status: 500 });
        }

        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway("google/gemini-3-flash-preview");

        const systemPrompt = `Tu es un assistant de gestion de projet intelligent et proactif. Tu aides l'utilisateur à gérer ses projets, tâches et notes.

RÈGLES IMPORTANTES :
- Tu peux créer des tâches en répondant avec un format spécial: [TASK]titre de la tâche[/TASK]
- Tu peux créer des notes avec: [NOTE]contenu de la note[/NOTE]
- Tu peux suggérer des priorités et deadlines
- Tu résumes régulièrement l'état du projet
- Tu poses des questions pour clarifier quand c'est ambigu
- Réponds en français

${projectContext ? `CONTEXTE DU PROJET ACTUEL :\n${projectContext}` : ""}`;

        const result = streamText({
          model,
          system: systemPrompt,
          messages: await convertToModelMessages(messages as UIMessage[]),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages as UIMessage[],
        });
      },
    },
  },
});
