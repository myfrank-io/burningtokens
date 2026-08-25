"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase";

type Props = {
  /** Rafraîchit les totaux affichés après un passage de la CLI. */
  onSynced: () => void;
};

export default function CliSync({ onSynced }: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    supabase.rpc("get_upload_token").then(({ data }) => {
      if (typeof data === "string") setToken(data);
    });
  }, []);

  const command = token
    ? `curl -fsSL https://burningtokens.vercel.app/iburned.js | node - ${token}`
    : null;

  async function copyCommand() {
    if (!command) return;
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard indisponible */
    }
  }

  return (
    <section className="flex flex-col gap-4 border-t border-zinc-800 pt-8">
      <h2 className="text-xl font-bold">Synchroniser Claude Code 💻</h2>
      <p className="text-sm text-zinc-500">
        Tu codes avec Claude Code ? Ta consommation <strong>exacte</strong> est
        déjà sur ta machine. Lance cette commande dans ton terminal : elle lit
        tes sessions locales et met ton compteur à jour. Elle n&apos;envoie{" "}
        <strong>que des compteurs de tokens par jour</strong> — jamais ton code,
        tes prompts ni tes conversations. Relance-la quand tu veux (résultat
        idempotent).
      </p>
      {command ? (
        <div className="flex items-center gap-2">
          <code className="flex-1 overflow-x-auto whitespace-nowrap rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2.5 text-xs text-orange-300">
            {command}
          </code>
          <button
            onClick={copyCommand}
            className="shrink-0 rounded-lg border border-orange-500/40 px-3 py-2 text-sm text-orange-300 transition hover:bg-orange-500/10"
          >
            {copied ? "Copié ✓" : "Copier"}
          </button>
        </div>
      ) : (
        <p className="text-sm text-zinc-600">Génération de ton jeton…</p>
      )}
      <div className="flex items-center gap-3">
        <button
          onClick={onSynced}
          className="rounded-full border border-zinc-700 px-5 py-2 text-sm text-zinc-400 transition hover:text-zinc-200"
        >
          J&apos;ai lancé la commande — rafraîchir mes totaux
        </button>
      </div>
      <p className="text-xs text-zinc-600">
        Nécessite Node.js (déjà là si tu utilises Claude Code). Le jeton
        ci-dessus est personnel — ne le partage pas.
      </p>
    </section>
  );
}
