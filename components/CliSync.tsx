"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase";

type Props = {
  /** Date de dernière synchro CLI (profiles.cli_synced_at), null si jamais. */
  cliSyncedAt: string | null;
  /** Rafraîchit les totaux affichés après un passage de la CLI. */
  onSynced: () => void;
};

export default function CliSync({ cliSyncedAt, onSynced }: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState<"auto" | "manual" | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    supabase.rpc("get_upload_token").then(({ data }) => {
      if (typeof data === "string") setToken(data);
    });
  }, []);

  const base = `curl -fsSL https://burningtokens.vercel.app/iburned.js | node - ${token ?? "…"}`;
  const autoCommand = `${base} --install`;

  async function copy(cmd: string, which: "auto" | "manual") {
    try {
      await navigator.clipboard.writeText(cmd);
      setCopied(which);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* clipboard indisponible */
    }
  }

  const hoursSinceSync = cliSyncedAt
    ? (Date.now() - new Date(cliSyncedAt).getTime()) / 3600000
    : null;
  const stale = hoursSinceSync !== null && hoursSinceSync > 26;

  const codeCls =
    "flex-1 overflow-x-auto whitespace-nowrap rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2.5 text-xs text-orange-300";
  const copyCls =
    "shrink-0 rounded-lg border border-orange-500/40 px-3 py-2 text-sm text-orange-300 transition hover:bg-orange-500/10";

  return (
    <section className="flex flex-col gap-4 border-t border-zinc-800 pt-8">
      <h2 className="text-xl font-bold">Synchroniser Claude Code 💻</h2>

      {cliSyncedAt ? (
        <p className={`text-sm ${stale ? "text-amber-400" : "text-emerald-400"}`}>
          {stale ? "⚠" : "✓"} Dernière synchro CLI :{" "}
          {new Date(cliSyncedAt).toLocaleString("fr-FR")}
          {stale &&
            " — plus de 26 h ! Ta machine n'a pas dû tourner à 23h50 : relance la commande manuelle ci-dessous."}
        </p>
      ) : (
        <p className="text-sm text-zinc-500">
          Tu codes avec Claude Code ? Ta consommation <strong>exacte</strong> est
          déjà sur ta machine (terminal, app desktop, extensions IDE). Installe
          la synchro automatique : elle tourne <strong>tous les soirs à 23h50</strong>{" "}
          et <strong>à chaque démarrage</strong> — machine éteinte à minuit,
          rattrapage au réveil.
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <div className="text-sm font-medium text-zinc-400">
          Synchro automatique (recommandé — macOS/Linux) :
        </div>
        <div className="flex items-center gap-2">
          <code className={codeCls}>{autoCommand}</code>
          <button onClick={() => copy(autoCommand, "auto")} className={copyCls}>
            {copied === "auto" ? "Copié ✓" : "Copier"}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="text-sm font-medium text-zinc-400">
          Ou synchro ponctuelle (manuelle) :
        </div>
        <div className="flex items-center gap-2">
          <code className={codeCls}>{base}</code>
          <button onClick={() => copy(base, "manual")} className={copyCls}>
            {copied === "manual" ? "Copié ✓" : "Copier"}
          </button>
        </div>
      </div>

      <div>
        <button
          onClick={onSynced}
          className="rounded-full border border-zinc-700 px-5 py-2 text-sm text-zinc-400 transition hover:text-zinc-200"
        >
          J&apos;ai lancé la commande — rafraîchir mes totaux
        </button>
      </div>

      <p className="text-xs text-zinc-600">
        Le script n&apos;envoie que des compteurs de tokens par jour — jamais ton
        code, tes prompts ni tes conversations. Jeton personnel : ne le partage
        pas. Désinstallation : même commande avec <code>--uninstall</code>.
      </p>
    </section>
  );
}
