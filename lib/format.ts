// Nombre compact pour l'URL du lien : 127671049 → "127M", 84210 → "84k".
// Arrondi vers le bas — le compteur exact vit sur la page, pas dans l'URL.
export function formatTokensSlug(n: number): string {
  if (n >= 1_000_000) return `${Math.floor(n / 1_000_000)}M`;
  if (n >= 1_000) return `${Math.floor(n / 1_000)}k`;
  return String(Math.max(0, Math.floor(n)));
}
