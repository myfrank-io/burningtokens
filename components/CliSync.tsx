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

  const manualCommand = `curl -fsSL https://burningtokens.vercel.app/iburned.js | node - ${token ?? "…"}`;
  const autoCommand = `${manualCommand} --install`;

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
    <section className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
      <h2 className="font-bold">
        <span className="text-orange-400">2.</span> Branche Claude Code
      </h2>

      {cliSyncedAt ? (
        <p className={`text-sm ${stale ? "text-amber-400" : "text-emerald-400"}`}>
          {stale
            ? `⚠ Pas de synchro depuis ${Math.floor(hoursSinceSync!)} h — relance la commande ci-dessous.`
            : `✓ Synchronisé (${new Date(cliSyncedAt).toLocaleString("fr-FR")})`}
        </p>
      ) : (
        <p className="text-sm text-zinc-400">
          Colle cette commande dans ton terminal. C&apos;est tout : ta conso
          Claude Code se synchronise ensuite toute seule, chaque soir.
        </p>
      )}

      <div className="flex items-center gap-2">
        <code className={codeCls}>{autoCommand}</code>
        <button onClick={() => copy(autoCommand, "auto")} className={copyCls}>
          {copied === "auto" ? "Copié ✓" : "Copier"}
        </button>
      </div>

      <button
        onClick={onSynced}
        className="self-start text-sm text-zinc-500 underline-offset-2 transition hover:text-zinc-300 hover:underline"
      >
        C&apos;est fait — actualiser mon compteur
      </button>

      <details className="text-sm text-zinc-500">
        <summary className="cursor-pointer transition hover:text-zinc-300">
          Un souci ? (synchro ponctuelle, désinstallation…)
        </summary>
        <div className="mt-3 flex flex-col gap-3">
          <div>
            Synchro ponctuelle, sans rien installer :
            <div className="mt-1.5 flex items-center gap-2">
              <code className={codeCls}>{manualCommand}</code>
              <button onClick={() => copy(manualCommand, "manual")} className={copyCls}>
                {copied === "manual" ? "Copié ✓" : "Copier"}
              </button>
            </div>
          </div>
          <p>
            Désinstaller : même commande avec <code>--uninstall</code>. Windows :
            passe par WSL. Le script n&apos;envoie que des compteurs de tokens par
            jour — jamais ton code ni tes conversations. Ton jeton est personnel.
          </p>
        </div>
      </details>
    </section>
  );
}
