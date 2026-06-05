import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client. Préfère la service_role si dispo (bypass RLS),
 * sinon retombe sur anon. À importer UNIQUEMENT depuis du code serveur.
 */
export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase non configuré côté serveur (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquant).",
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
