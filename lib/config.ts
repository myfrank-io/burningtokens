// Configuration Supabase du projet "burningtokens" (fziuboaggtxtewfvqbsb).
// L'URL et la clé "publishable" sont publiques par conception : elles sont
// envoyées au navigateur de chaque visiteur. La sécurité des données repose
// sur les politiques Row Level Security côté base, jamais sur ces valeurs.
// `||` (et non `??`) : une variable définie mais vide doit aussi retomber
// sur la valeur par défaut.
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
  "https://fziuboaggtxtewfvqbsb.supabase.co";

export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  "sb_publishable_gOIIShlCeaKiYI79JVkVBw_EJKlso8A";
