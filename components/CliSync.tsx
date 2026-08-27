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
        <span className="text-orange-400">2.</span> Branche Claude Code — une
        commande, une fois
      </h2>

      {cliSyncedAt ? (
        <p className={`text-sm ${stale ? "text-amber-400" : "text-emerald-400"}`}>
          {stale
            ? `⚠ Pas de nouvelles de ta machine depuis ${Math.floor(hoursSinceSync!)} h — elle était sans doute éteinte. Relance la commande ci-dessous (ou attends : ça repart tout seul au prochain démarrage).`
            : `✓ Synchronisé — dernier passage le ${new Date(cliSyncedAt).toLocaleString("fr-FR")}. Plus rien à faire : ça tourne tout seul chaque soir.`}
        </p>
      ) : (
        <p className="text-sm text-zinc-400">
          Colle cette commande dans le terminal de{" "}
          <strong>ta machine principale</strong>, une seule fois. Elle envoie
          tout ton historique Claude Code (exact, depuis le début) et installe
          la synchro automatique : chaque soir à 23h50 et à chaque démarrage.
          Ensuite, tu n&apos;y touches plus jamais.
        </p>
      )}

      <div className="flex items-center gap-2">
        <code className={codeCls}>{autoCommand}</code>
        <button onClick={() => copy(autoCommand, "auto")} className={copyCls}>
          {copied === "auto" ? "Copié ✓" : "Copier"}
        </button>
      </div>

      <p className="text-xs text-zinc-600">
        ⚠ À coller dans <strong>ton</strong> terminal (Terminal, iTerm…) — pas
        dans une session Claude : son garde-fou refuse d&apos;exécuter des
        scripts distants, c&apos;est normal et c&apos;est sain.
      </p>

      <button
        onClick={onSynced}
        className="self-start text-sm text-zinc-500 underline-offset-2 transition hover:text-zinc-300 hover:underline"
      >
        C&apos;est fait — actualiser mon compteur
      </button>

      <details className="text-sm text-zinc-500">
        <summary className="cursor-pointer transition hover:text-zinc-300">
          Questions fréquentes (plusieurs machines, vérifier, désinstaller…)
        </summary>
        <div className="mt-3 flex flex-col gap-3">
          <p>
            <strong className="text-zinc-400">Plusieurs machines, Cowork ?</strong>{" "}
            Lance la même commande là-bas si tu veux compter leurs tokens aussi.
            Chaque session Claude Code ne compte qu&apos;une seule fois, où
            qu&apos;elle soit vue : le total reste identique partout, rien ne
            s&apos;écrase, rien ne double.
          </p>
          <p>
            <strong className="text-zinc-400">Je change de Mac ?</strong> Tu ne
            perds rien : tout ce qui a déjà été synchronisé est conservé sur nos
            serveurs pour toujours. Lance simplement la commande sur la nouvelle
            machine.
          </p>
          <div>
            <strong className="text-zinc-400">Synchro ponctuelle</strong> (sans
            rien installer) :
            <div className="mt-1.5 flex items-center gap-2">
              <code className={codeCls}>{manualCommand}</code>
              <button onClick={() => copy(manualCommand, "manual")} className={copyCls}>
                {copied === "manual" ? "Copié ✓" : "Copier"}
              </button>
            </div>
          </div>
          <div>
            <strong className="text-zinc-400">Vérifier que ça tourne</strong>{" "}
            (macOS) — la synchro passe à 23h50 et à chaque ouverture de session,
            pas en continu :
            <pre className="mt-1.5 overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2.5 text-xs text-zinc-400">{`launchctl list | grep iburned    # installé ?
launchctl start my.iburned.sync  # forcer une synchro maintenant
cat ~/.iburned/sync.log          # voir le dernier passage`}</pre>
          </div>
          <p>
            <strong className="text-zinc-400">Désinstaller :</strong> même
            commande avec <code>--uninstall</code>. Windows : passe par WSL.
          </p>
          <p>
            Le script n&apos;envoie que des compteurs de tokens par jour — jamais
            ton code, tes prompts ni tes conversations (
            <a
              href="https://github.com/myfrank-io/burningtokens/blob/main/public/iburned.js"
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-400 hover:text-orange-300"
            >
              code source public
            </a>
            ). Ton jeton est personnel — s&apos;il a fuité (collé dans un chat,
            un screenshot…),{" "}
            <button
              onClick={async () => {
                const { data } = await getSupabaseBrowser().rpc("rotate_upload_token");
                if (typeof data === "string") setToken(data);
              }}
              className="text-orange-400 underline-offset-2 hover:text-orange-300 hover:underline"
            >
              régénère-le ici
            </button>{" "}
            (l&apos;ancien est révoqué immédiatement ; relance ensuite la
            commande <code>--install</code> avec le nouveau).
          </p>
        </div>
      </details>
    </section>
  );
}
