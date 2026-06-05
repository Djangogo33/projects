import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/notion/v1";

interface NotionPage {
  id: string;
  url: string;
  properties: Record<string, unknown>;
  created_time: string;
  last_edited_time: string;
}

function plainText(rich: Array<{ plain_text?: string }> | undefined): string {
  return (rich ?? []).map((t) => t.plain_text ?? "").join("");
}

function extractTitleFromProperties(props: Record<string, unknown>): string {
  for (const value of Object.values(props)) {
    const v = value as { type?: string; title?: Array<{ plain_text?: string }> };
    if (v?.type === "title") return plainText(v.title);
  }
  return "Sans titre";
}

function extractText(props: Record<string, unknown>, key: string): string {
  const v = props[key] as { type?: string; rich_text?: Array<{ plain_text?: string }>; url?: string } | undefined;
  if (!v) return "";
  if (v.type === "rich_text") return plainText(v.rich_text);
  if (v.type === "url") return v.url ?? "";
  return "";
}

async function notionFetch(path: string, body?: unknown): Promise<unknown> {
  const lovKey = process.env.LOVABLE_API_KEY;
  const notionKey = process.env.NOTION_API_KEY ?? process.env.NOTION_TOKEN;
  if (!notionKey) throw new Error("NOTION_API_KEY / NOTION_TOKEN manquant");

  // En preview Lovable on passe par le gateway. En self-host (Vercel), on appelle Notion direct.
  const useGateway = Boolean(lovKey && process.env.NOTION_API_KEY);
  const url = useGateway ? `${GATEWAY_URL}${path}` : `https://api.notion.com/v1${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (useGateway) {
    headers["Authorization"] = `Bearer ${lovKey}`;
    headers["X-Connection-Api-Key"] = notionKey;
  } else {
    headers["Authorization"] = `Bearer ${notionKey}`;
    headers["Notion-Version"] = "2022-06-28";
  }

  const res = await fetch(url, {
    method: body ? "POST" : "GET",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Notion ${res.status}: ${t.slice(0, 200)}`);
  }
  return res.json();
}

export interface ImportPreview {
  externalId: string;
  name: string;
  description: string;
  url?: string;
  source: "notion" | "csv" | "markdown" | "pdf" | "html";
}

export const previewNotionImport = createServerFn({ method: "POST" })
  .inputValidator(z.object({ databaseId: z.string().min(1) }))
  .handler(async ({ data }): Promise<{ items: ImportPreview[] }> => {
    const result = await notionFetch(`/databases/${data.databaseId}/query`, {}) as { results: NotionPage[] };
    const items: ImportPreview[] = result.results.map((page) => ({
      externalId: page.id,
      name: extractTitleFromProperties(page.properties),
      description: extractText(page.properties, "Description") || extractText(page.properties, "Summary") || "",
      url: page.url,
      source: "notion" as const,
    }));
    return { items };
  });

export const importItems = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    items: z.array(z.object({
      externalId: z.string().optional(),
      name: z.string().min(1),
      description: z.string().default(""),
      url: z.string().url().optional(),
      source: z.enum(["notion", "csv", "markdown", "pdf", "html", "manual"]),
      category: z.string().default(""),
      links: z.array(z.object({
        label: z.string(), url: z.string().url(), kind: z.enum(["demo", "docs", "repo", "design", "other"]).default("other"),
      })).default([]),
    })),
  }))
  .handler(async ({ data }) => {
    const { getSupabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = getSupabaseAdmin();
    let inserted = 0;
    for (const item of data.items) {
      const source = item.source === "manual" ? "manual" : (item.source === "notion" ? "notion" : "import");
      const { data: project, error } = await db.from("projects").insert({
        name: item.name,
        description: item.description,
        category: item.category,
        source,
        source_id: item.externalId ?? null,
        source_url: item.url ?? null,
        status: "planning",
        priority: "medium",
      }).select("id").single();
      if (error || !project) continue;
      inserted++;
      for (const link of item.links) {
        await db.from("project_links").insert({
          project_id: project.id, label: link.label, url: link.url, kind: link.kind,
        });
      }
    }
    return { inserted };
  });
