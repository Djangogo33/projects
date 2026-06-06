import { createClient } from "@supabase/supabase-js";

// Valeurs publiques (anon key + URL projet). OK de les committer.
const SUPABASE_URL = "https://mqyybalnxcomallqdqzq.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xeXliYWxueGNvbWFsbHFkcXpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3MDY2NDgsImV4cCI6MjA5NjI4MjY0OH0.S7xn8Wesb83wMDdVxY1rjJt8kj0zbOnTK5uAsyYkHfI";

export const isSupabaseConfigured = true;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
