"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import ClaudeSync from "@/components/ClaudeSync";
import CliSync from "@/components/CliSync";
import { formatTokensSlug } from "@/lib/format";
import { getSupabaseBrowser } from "@/lib/supabase";

const HANDLE_RE = /^[a-z0-9][a-z0-9._-]{0,37}[a-z0-9]$/;
const TOKENS_PREFIX_RE = /^\d+tokens$/; // réservé : préfixe d'URL /1000tokens/…
const RESERVED = ["login", "dashboard", "api", "admin", "auth", "settings", "account", "www", "app", "moi"];

type Profile = {
  id: string;
  handle: string;
  display_name: string;
  headline: string | null;
  avatar_url: string | null;
  linkedin_url: string | null;
  claude_since: string | null;
  display_tokens: number;
  cli_synced_at: string | null;
};

export default function DashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [totalTokens, setTotalTokens] = useState<number | null>(null);

  // Formulaire profil
  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [headline, setHeadline] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [claudeSince, setClaudeSince] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const loadProfile = useCallback(async (userId: string) => {
    const supabase = getSupabaseBrowser();
    const { data } = await supabase
      .from("profiles")
      .select("id, handle, display_name, headline, avatar_url, linkedin_url, claude_since, display_tokens, cli_synced_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (data) {
      setProfile(data);
      setHandle(data.handle ?? "");
      setDisplayName(data.display_name ?? "");
      setHeadline(data.headline ?? "");
      setLinkedinUrl(data.linkedin_url ?? "");
      setAvatarUrl(data.avatar_url ?? "");
      setClaudeSince(data.claude_since ?? "");
      const { data: t } = await supabase
        .from("profile_burn_totals")
        .select("total_tokens")
        .eq("profile_id", data.id)
        .maybeSingle();
      if (t) setTotalTokens(Number(t.total_tokens));
    }
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthChecked(true);
      if (data.session) loadProfile(data.session.user.id);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setAuthChecked(true);
      if (s) loadProfile(s.user.id);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    const cleanHandle = handle.trim().toLowerCase();
    if (!HANDLE_RE.test(cleanHandle)) {
      setSaveMsg({ ok: false, text: "Pseudo invalide : 2 à 39 caractères (minuscules, chiffres, . - ou _)." });
      return;
    }
    if (RESERVED.includes(cleanHandle) || TOKENS_PREFIX_RE.test(cleanHandle)) {
      setSaveMsg({ ok: false, text: "Ce pseudo est réservé." });
      return;
    }
    setSaving(true);
    setSaveMsg(null);
    const supabase = getSupabaseBrowser();
    const fields = {
      handle: cleanHandle,
      display_name: displayName.trim() || cleanHandle,
      headline: headline.trim() || null,
      linkedin_url: linkedinUrl.trim() || null,
      avatar_url: avatarUrl.trim() || null,
      claude_since: claudeSince || null,
    };
    const { error } = profile
      ? await supabase.from("profiles").update(fields).eq("id", profile.id)
      : await supabase.from("profiles").insert({ ...fields, user_id: session.user.id });
    if (error) {
      setSaveMsg({
        ok: false,
        text: error.code === "23505"
          ? `« ${cleanHandle} » est déjà pris, essaie-en un autre.`
          : error.code === "23514"
          ? "Pseudo invalide ou réservé."
          : `Erreur : ${error.message}`,
      });
    } else {
      setSaveMsg({ ok: true, text: "Enregistré ✓" });
      await loadProfile(session.user.id);
    }
    setSaving(false);
  }

  async function signOut() {
    await getSupabaseBrowser().auth.signOut();
    router.replace("/");
  }

  // Un seul lien, affiché et copié à l'identique. Le nombre est recalculé
  // chaque nuit à minuit ; les anciens nombres restent des liens valides.
  const host = typeof window !== "undefined" ? window.location.host : "";
  const dailyPath = profile
    ? `/${formatTokensSlug(profile.display_tokens)}tokens/${profile.handle}`
    : null;
  const dailyLink = dailyPath && host ? `${host}${dailyPath}` : null;

  async function copyDailyLink() {
    if (!dailyLink) return;
    try {
      await navigator.clipboard.writeText(`https://${dailyLink}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard indisponible */
    }
  }

  if (!authChecked) {
    return (
      <main className="flex min-h-screen items-center justify-center text-zinc-500">
        Chargement…
      </main>
    );
  }

  if (!session) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="text-5xl">🔒</div>
        <p className="text-zinc-300">Connecte-toi pour gérer ton compteur.</p>
        <Link
          href="/login"
          className="rounded-full bg-gradient-to-r from-orange-500 to-rose-500 px-8 py-3 font-semibold text-white transition hover:opacity-90"
        >
          Se connecter →
        </Link>
      </main>
    );
  }

  const inputCls =
    "w-full rounded-xl border border-zinc-700 bg-zinc-900/70 px-4 py-2.5 text-white outline-none transition focus:border-orange-500/60";
  const labelCls = "text-left text-sm font-medium text-zinc-400";

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 px-6 py-10">
      <header className="flex items-center justify-between">
        <Link href="/" className="text-2xl">🔥</Link>
        <button onClick={signOut} className="text-sm text-zinc-500 hover:text-zinc-300">
          Se déconnecter
        </button>
      </header>

      {profile && (
        <section className="flame-glow flex flex-col gap-4 rounded-3xl border border-orange-500/20 bg-zinc-900/70 p-6 text-center">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-zinc-400">
              Tokens brûlés
            </div>
            <div className="flame-text mt-1 text-4xl font-extrabold tabular-nums">
              {new Intl.NumberFormat("fr-FR").format(totalTokens ?? profile.display_tokens)}
            </div>
          </div>
          {dailyLink && (
            <div className="flex items-center gap-2">
              <code className="flex-1 overflow-x-auto whitespace-nowrap rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2.5 text-sm text-orange-300">
                {dailyLink}
              </code>
              <button
                onClick={copyDailyLink}
                className="shrink-0 rounded-lg bg-gradient-to-r from-orange-500 to-rose-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
              >
                {copied ? "Copié ✓" : "Copier"}
              </button>
            </div>
          )}
          <div className="flex items-center justify-center gap-4 text-sm">
            {dailyPath && (
              <Link href={dailyPath} className="text-orange-400 hover:text-orange-300">
                Voir ma page ↗
              </Link>
            )}
            <span className="text-zinc-600">
              Ce lien va dans ta bio LinkedIn — le nombre se met à jour chaque
              nuit, les anciens liens marchent toujours.
            </span>
          </div>
        </section>
      )}

      <form
        onSubmit={saveProfile}
        className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5"
      >
        <h2 className="font-bold">
          <span className="text-orange-400">1.</span> Ton profil
        </h2>
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>Ton pseudo</label>
          <div className="flex items-center gap-2">
            <span className="text-zinc-500">@</span>
            <input
              value={handle}
              onChange={(e) => setHandle(e.target.value.toLowerCase())}
              placeholder="joseph.lecomte"
              required
              className={inputCls}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>Ton profil LinkedIn</label>
          <input
            type="url"
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
            placeholder="https://www.linkedin.com/in/…"
            className={inputCls}
          />
        </div>
        <details className="text-sm text-zinc-500">
          <summary className="cursor-pointer transition hover:text-zinc-300">
            Plus d&apos;options (nom, photo, bio…)
          </summary>
          <div className="mt-3 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Nom affiché</label>
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Jean Dupont" className={inputCls} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Phrase d&apos;accroche</label>
              <input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Brûleur de tokens professionnel" className={inputCls} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>URL de ta photo</label>
              <input type="url" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://…/photo.jpg" className={inputCls} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Compte Claude ouvert le</label>
              <input type="date" value={claudeSince} onChange={(e) => setClaudeSince(e.target.value)} className={inputCls} />
            </div>
          </div>
        </details>
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-gradient-to-r from-orange-500 to-rose-500 px-8 py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
        {saveMsg && (
          <p className={`text-sm ${saveMsg.ok ? "text-emerald-400" : "text-rose-400"}`}>{saveMsg.text}</p>
        )}
      </form>

      {profile && (
        <CliSync
          cliSyncedAt={profile.cli_synced_at}
          onSynced={() => loadProfile(session.user.id)}
        />
      )}

      {profile && (
        <details className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 text-sm text-zinc-500">
          <summary className="cursor-pointer font-medium transition hover:text-zinc-300">
            Options avancées (API Anthropic pour les organisations)
          </summary>
          <ClaudeSync
            profileId={profile.id}
            onSynced={() => loadProfile(session.user.id)}
          />
        </details>
      )}
    </main>
  );
}
