import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./config";

// Client one-shot pour les Server Components (pas de session à persister).
export function createSupabaseClient() {
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Client unique côté navigateur : session persistée (localStorage) et
// détection du retour de magic link dans l'URL. flowType "implicit" pour que
// le lien fonctionne même ouvert dans un autre navigateur que celui d'origine.
let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowser(): SupabaseClient {
  if (!browserClient) {
    browserClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { flowType: "implicit" },
    });
  }
  return browserClient;
}
