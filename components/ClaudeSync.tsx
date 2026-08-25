"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase";

type Connection = {
  status: string;
  error: string | null;
  last_synced_at: string | null;
};

type Props = {
  profileId: string;
  /** Appelé après une synchro réussie pour rafraîchir les totaux affichés. */
  onSynced: () => void;
};

export default function ClaudeSync({ profileId, onSynced }: Props) {
  const [connection, setConnection] = useState<Connection | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const autoSyncDone = useRef(false);

  const loadConnection = useCallback(async () => {
    const supabase = getSupabaseBrowser();
    const { data } = await supabase
      .from("anthropic_connections")
      .select("status, error, last_synced_at")
      .eq("profile_id", profileId)
      .maybeSingle();
    setConnection(data ?? null);
    setLoaded(true);
    return data ?? null;
  }, [profileId]);

  const sync = useCallback(
    async (key?: string, silent = false) => {
      setSyncing(true);
      if (!silent) setMessage(null);
      const supabase = getSupabaseBrowser();
      const { data, error } = await supabase.functions.invoke("sync-anthropic", {
        body: key ? { api_key: key } : {},
      });
      if (error || data?.error) {
        let text = data?.error ?? "La synchronisation a échoué.";
        if (error && "context" in error) {
          try {
            const ctx = await (error as { context: Response }).context.json();
            if (ctx?.error) text = ctx.error;
          } catch {
            /* réponse non JSON */
          }
        }
        setMessage({ ok: false, text });
      } else {
        setApiKey("");
        setMessage({
          ok: true,
          text: `✓ Synchronisé : ${new Intl.NumberFormat("fr-FR").format(data.total)} tokens exacts depuis l'ouverture du compte (${data.days} jours d'activité).`,
        });
        onSynced();
      }
      await loadConnection();
      setSyncing(false);
    },
    [loadConnection, onSynced],
  );

  useEffect(() => {
    loadConnection().then((conn) => {
      // Resynchronise automatiquement au plus une fois par visite si la
      // dernière synchro date de plus de 12 h.
      if (
        conn?.status === "connected" &&
        conn.last_synced_at &&
        Date.now() - new Date(conn.last_synced_at).getTime() > 12 * 3600 * 1000 &&
        !autoSyncDone.current
      ) {
        autoSyncDone.current = true;
        sync(undefined, true);
      }
    });
  }, [loadConnection, sync]);

  async function disconnect() {
    setSyncing(true);
    const supabase = getSupabaseBrowser();
    await supabase.functions.invoke("sync-anthropic", {
      body: { action: "disconnect" },
    });
    setMessage(null);
    await loadConnection();
    onSynced();
    setSyncing(false);
  }

  if (!loaded) return null;

  const inputCls =
    "w-full rounded-xl border border-zinc-700 bg-zinc-900/70 px-4 py-2.5 text-white outline-none transition focus:border-orange-500/60";

  return (
    <section className="flex flex-col gap-4 border-t border-zinc-800 pt-8">
      <h2 className="text-xl font-bold">API Anthropic (organisations)</h2>

      {connection?.status === "connected" ? (
        <>
          <p className="text-sm text-emerald-400">
            ✓ Compte Anthropic connecté — nombre de tokens <strong>exact</strong>,
            {connection.last_synced_at && (
              <>
                {" "}dernière synchro le{" "}
                {new Date(connection.last_synced_at).toLocaleString("fr-FR")}
              </>
            )}
            . Resynchronisation automatique à chaque visite.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => sync()}
              disabled={syncing}
              className="rounded-full border border-orange-500/40 px-6 py-2.5 text-sm font-semibold text-orange-300 transition hover:bg-orange-500/10 disabled:opacity-50"
            >
              {syncing ? "Synchronisation…" : "Resynchroniser maintenant"}
            </button>
            <button
              onClick={disconnect}
              disabled={syncing}
              className="rounded-full border border-zinc-700 px-6 py-2.5 text-sm text-zinc-400 transition hover:text-zinc-200 disabled:opacity-50"
            >
              Déconnecter
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-zinc-500">
            Connecte ton organisation Anthropic pour afficher le nombre{" "}
            <strong>exact</strong> de tokens dépensés via l&apos;API depuis
            l&apos;ouverture de ton compte. Il faut une clé{" "}
            <strong>Admin API</strong> (Console Anthropic → Settings →
            Organization → Admin keys, format <code>sk-ant-admin…</code>). La clé
            est stockée côté serveur et n&apos;est jamais renvoyée au navigateur.
            NB : la conso d&apos;un abonnement claude.ai Pro/Max n&apos;est pas
            exposée par Anthropic — seule celle de l&apos;API/Console l&apos;est.
          </p>
          {connection?.status === "error" && connection.error && (
            <p className="text-sm text-rose-400">{connection.error}</p>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (apiKey.trim()) sync(apiKey.trim());
            }}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-admin…"
              required
              className={inputCls}
            />
            <button
              type="submit"
              disabled={syncing}
              className="shrink-0 rounded-full bg-gradient-to-r from-orange-500 to-rose-500 px-6 py-2.5 font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {syncing ? "Synchronisation…" : "Connecter 🔥"}
            </button>
          </form>
        </>
      )}

      {message && (
        <p className={`text-sm ${message.ok ? "text-emerald-400" : "text-rose-400"}`}>
          {message.text}
        </p>
      )}
      {syncing && !message && (
        <p className="text-xs text-zinc-600">
          Récupération de tout l&apos;historique auprès d&apos;Anthropic — ça peut
          prendre jusqu&apos;à une minute…
        </p>
      )}
    </section>
  );
}
