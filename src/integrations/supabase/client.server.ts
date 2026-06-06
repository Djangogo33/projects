import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client. Préfère la service_role si dispo (bypass RLS),
 * sinon retombe sur anon. À importer UNIQUEMENT depuis du code serveur.
 *
 * Variables d'environnement attendues (prefixes non-réservés Lovable) :
 *   APP_SUPABASE_URL, APP_SUPABASE_ANON_KEY, APP_SUPABASE_SERVICE_ROLE_KEY
 */
export function getSupabaseAdmin() {
  const url = process.env.APP_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key =
    process.env.APP_SUPABASE_SERVICE_ROLE_KEY ??
    process.env.APP_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase non configuré côté serveur (APP_SUPABASE_URL / APP_SUPABASE_ANON_KEY manquant).",
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
