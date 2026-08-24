// Configuration Supabase du projet "burningtokens" (fziuboaggtxtewfvqbsb).
// L'URL et la clé "publishable" sont publiques par conception : elles sont
// envoyées au navigateur de chaque visiteur. La sécurité des données repose
// sur les politiques Row Level Security côté base, jamais sur ces valeurs.
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://fziuboaggtxtewfvqbsb.supabase.co";

export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  "sb_publishable_gOIIShlCeaKiYI79JVkVBw_EJKlso8A";
