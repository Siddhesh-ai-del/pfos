import { createClient } from "@supabase/supabase-js";

// Demo-mode server client. Rides the service key (RLS bypass) per plan §4.3.
// Auth swap for the SaaS path is documented in docs/saas-migration.md (Slice 7+).

export function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Missing SUPABASE_URL / SUPABASE_SERVICE_KEY in environment (.env.local)."
    );
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
