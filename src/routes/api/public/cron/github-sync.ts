import { createFileRoute } from "@tanstack/react-router";

// Cron public : protégé par x-cron-secret == process.env.CRON_SECRET
// Configure côté Vercel :
//   vercel.json → { "crons": [{ "path": "/api/public/cron/github-sync", "schedule": "0 6 * * *" }] }
// (Vercel ne supporte pas les headers custom dans la config cron native ; passe le secret via la query string si tu utilises Vercel Cron.)
// Alternative : pg_cron ou n'importe quel scheduler externe (cron-job.org, GitHub Actions...).

export const Route = createFileRoute("/api/public/cron/github-sync")({
  server: {
    handlers: {
      POST: handle,
      GET: handle,
    },
  },
});

async function handle({ request }: { request: Request }) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return new Response("CRON_SECRET non configuré côté serveur", { status: 500 });
  }
  const provided = request.headers.get("x-cron-secret") ?? new URL(request.url).searchParams.get("secret");
  if (provided !== expected) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { runGithubSync } = await import("@/lib/github-sync.functions");
  const result = await runGithubSync();
  return Response.json(result);
}
