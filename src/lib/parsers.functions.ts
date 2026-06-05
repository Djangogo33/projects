import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { ImportPreview } from "./import.functions";

// Parse fichiers texte côté serveur. Tous les fichiers binaires (PDF) doivent
// être envoyés en base64. Sur le runtime preview (Cloudflare Workers), `pdf-parse`
// ne fonctionne pas — utilise la version production (Vercel Node) pour le PDF.

export const parseTextContent = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    format: z.enum(["csv", "markdown", "html"]),
    content: z.string().min(1).max(2_000_000),
  }))
  .handler(async ({ data }): Promise<{ items: ImportPreview[] }> => {
    if (data.format === "csv") {
      const Papa = (await import("papaparse")).default;
      const parsed = Papa.parse<Record<string, string>>(data.content, {
        header: true, skipEmptyLines: true,
      });
      const items: ImportPreview[] = (parsed.data ?? []).map((row, i) => ({
        externalId: `csv-${i}`,
        name: row.name ?? row.title ?? row.Name ?? row.Title ?? `Row ${i + 1}`,
        description: row.description ?? row.Description ?? row.summary ?? "",
        url: row.url ?? row.link ?? row.URL ?? undefined,
        source: "csv",
      }));
      return { items };
    }

    if (data.format === "markdown") {
      const matter = (await import("gray-matter")).default;
      // Sépare en plusieurs projets si présence de "---" multiples ou de "# titre"
      const blocks = data.content.split(/\n---\n/g).filter((b) => b.trim());
      const items: ImportPreview[] = blocks.map((block, i) => {
        try {
          const parsed = matter(block);
          const fm = parsed.data as Record<string, unknown>;
          const titleMatch = parsed.content.match(/^#\s+(.+)$/m);
          return {
            externalId: `md-${i}`,
            name: (fm.title as string) ?? (fm.name as string) ?? titleMatch?.[1] ?? `Document ${i + 1}`,
            description: (fm.description as string) ?? parsed.content.replace(/^#\s+.*$/m, "").trim().slice(0, 280),
            url: fm.url as string | undefined,
            source: "markdown",
          };
        } catch {
          return { externalId: `md-${i}`, name: `Document ${i + 1}`, description: block.slice(0, 280), source: "markdown" as const };
        }
      });
      return { items };
    }

    if (data.format === "html") {
      const { load } = await import("cheerio");
      const $ = load(data.content);
      const title = $("title").first().text() || $("h1").first().text() || "Sans titre";
      const desc = $('meta[name="description"]').attr("content")
        ?? $('meta[property="og:description"]').attr("content")
        ?? $("p").first().text().slice(0, 280)
        ?? "";
      const canonical = $('link[rel="canonical"]').attr("href") ?? $('meta[property="og:url"]').attr("content");
      return { items: [{ externalId: "html-0", name: title, description: desc, url: canonical, source: "html" }] };
    }

    return { items: [] };
  });

export const parsePdfContent = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    fileName: z.string().min(1).max(255),
    base64: z.string().min(1),
  }))
  .handler(async ({ data }): Promise<{ items: ImportPreview[]; warning?: string }> => {
    try {
      const pdfParse = (await import("pdf-parse")).default as (
        b: Buffer | Uint8Array,
      ) => Promise<{ text: string; info?: { Title?: string } }>;
      const buf = Buffer.from(data.base64, "base64");
      const parsed = await pdfParse(buf);
      const title = parsed.info?.Title || data.fileName.replace(/\.pdf$/i, "");
      const text = (parsed.text ?? "").trim();
      return {
        items: [{
          externalId: `pdf-${data.fileName}`,
          name: title,
          description: text.slice(0, 500),
          source: "pdf",
        }],
      };
    } catch (err) {
      return {
        items: [],
        warning: "Le parsing PDF n'est pas disponible sur ce runtime (Cloudflare Workers). Déploie sur Vercel pour activer cette fonction. Erreur: " + (err instanceof Error ? err.message : String(err)),
      };
    }
  });
