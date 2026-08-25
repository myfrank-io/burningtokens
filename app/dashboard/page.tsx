"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import ClaudeSync from "@/components/ClaudeSync";
import CliSync from "@/components/CliSync";
import { getSupabaseBrowser } from "@/lib/supabase";

const HANDLE_RE = /^[a-z0-9][a-z0-9._-]{0,37}[a-z0-9]$/;
const TOKENS_PREFIX_RE = /^\d+tokens$/; // réservé : préfixe d'URL /1000tokens/…
const RESERVED = ["login", "dashboard", "api", "admin", "auth", "settings", "account", "www", "app", "moi"];
const MODELS = ["claude-opus-4", "claude-sonnet-4", "claude-haiku-4-5", "autre"];

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

type Totals = { total_tokens: number; events: number };

export default function DashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [totals, setTotals] = useState<Totals | null>(null);

  // Formulaire profil
  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [headline, setHeadline] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [claudeSince, setClaudeSince] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Formulaire conso
  const [inputTokens, setInputTokens] = useState("");
  const [outputTokens, setOutputTokens] = useState("");
  const [model, setModel] = useState(MODELS[0]);
  const [burning, setBurning] = useState(false);
  const [burnMsg, setBurnMsg] = useState<string | null>(null);

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
        .select("total_tokens, events")
        .eq("profile_id", data.id)
        .maybeSingle();
      if (t) setTotals({ total_tokens: Number(t.total_tokens), events: Number(t.events) });
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
      setSaveMsg({ ok: false, text: "Handle invalide : 2 à 39 caractères (minuscules, chiffres, . - ou _), commence et finit par une lettre ou un chiffre." });
      return;
    }
    if (RESERVED.includes(cleanHandle) || TOKENS_PREFIX_RE.test(cleanHandle)) {
      setSaveMsg({ ok: false, text: "Ce handle est réservé." });
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
    // Le trigger crée normalement le profil à l'inscription ; upsert au cas où.
    const { error } = profile
      ? await supabase.from("profiles").update(fields).eq("id", profile.id)
      : await supabase.from("profiles").insert({ ...fields, user_id: session.user.id });
    if (error) {
      setSaveMsg({
        ok: false,
        text: error.code === "23505"
          ? `Le handle « ${cleanHandle} » est déjà pris, essaie-en un autre.`
          : error.code === "23514"
          ? "Handle invalide ou réservé."
          : `Erreur : ${error.message}`,
      });
    } else {
      setSaveMsg({ ok: true, text: "Profil enregistré ✓" });
      await loadProfile(session.user.id);
    }
    setSaving(false);
  }

  async function burnTokens(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    const inTok = Math.max(0, parseInt(inputTokens || "0", 10) || 0);
    const outTok = Math.max(0, parseInt(outputTokens || "0", 10) || 0);
    if (inTok + outTok === 0) {
      setBurnMsg("Indique au moins un nombre de tokens.");
      return;
    }
    setBurning(true);
    setBurnMsg(null);
    const supabase = getSupabaseBrowser();
    const { error } = await supabase.from("usage_events").insert({
      profile_id: profile.id,
      model: model === "autre" ? null : model,
      input_tokens: inTok,
      output_tokens: outTok,
      source: "manual",
    });
    if (error) {
      setBurnMsg(`Erreur : ${error.message}`);
    } else {
      setBurnMsg(`🔥 ${new Intl.NumberFormat("fr-FR").format(inTok + outTok)} tokens ajoutés — ton compteur public vient de bouger en direct.`);
      setInputTokens("");
      setOutputTokens("");
      setTotals((t) => t ? { total_tokens: t.total_tokens + inTok + outTok, events: t.events + 1 } : { total_tokens: inTok + outTok, events: 1 });
    }
    setBurning(false);
  }

  async function signOut() {
    await getSupabaseBrowser().auth.signOut();
    router.replace("/");
  }

  // Lien du jour : le nombre de tokens dans l'URL est recalculé chaque nuit à
  // minuit ; tout ancien nombre reste un lien valide.
  const dailyPath = profile ? `/${profile.display_tokens}tokens/${profile.handle}` : null;
  const [copied, setCopied] = useState(false);
  async function copyDailyLink() {
    if (!dailyPath) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${dailyPath}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard indisponible : l'utilisateur copiera à la main */
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
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-8 px-6 py-12">
      <header className="flex items-center justify-between">
        <Link href="/" className="text-2xl">🔥</Link>
        <div className="flex items-center gap-4 text-sm">
          {dailyPath && (
            <Link href={dailyPath} className="text-orange-400 hover:text-orange-300">
              Voir ma page publique ↗
            </Link>
          )}
          <button onClick={signOut} className="text-zinc-500 hover:text-zinc-300">
            Se déconnecter
          </button>
        </div>
      </header>

      {totals && (
        <div className="flame-glow rounded-2xl border border-orange-500/20 bg-zinc-900/70 px-6 py-5 text-center">
          <div className="text-xs uppercase tracking-widest text-zinc-400">Ton total</div>
          <div className="flame-text mt-1 text-3xl font-extrabold tabular-nums">
            {new Intl.NumberFormat("fr-FR").format(totals.total_tokens)}
          </div>
          <div className="mt-1 text-xs text-zinc-500">{totals.events} événement(s)</div>
        </div>
      )}

      {profile && dailyPath && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 px-5 py-4">
          <div className="text-sm font-medium text-zinc-400">
            Ton lien du jour (mis à jour chaque nuit à minuit) :
          </div>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 truncate rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-orange-300">
              iburned.my{dailyPath}
            </code>
            <button
              onClick={copyDailyLink}
              className="shrink-0 rounded-lg border border-orange-500/40 px-3 py-2 text-sm text-orange-300 transition hover:bg-orange-500/10"
            >
              {copied ? "Copié ✓" : "Copier"}
            </button>
          </div>
          <p className="mt-2 text-xs text-zinc-600">
            Colle-le dans ta bio LinkedIn — même quand le nombre change, tous
            tes anciens liens continuent de fonctionner.
          </p>
        </div>
      )}

      <form onSubmit={saveProfile} className="flex flex-col gap-4">
        <h1 className="text-xl font-bold">Mon profil</h1>
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>Handle (ton lien : iburned.my/1000tokens/…)</label>
          <div className="flex items-center gap-2">
            <span className="text-zinc-500">@</span>
            <input value={handle} onChange={(e) => setHandle(e.target.value.toLowerCase())} placeholder="joseph.lecomte" required className={inputCls} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>Nom affiché</label>
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Jean Dupont" className={inputCls} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>Headline</label>
          <input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Brûleur de tokens professionnel" className={inputCls} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>URL LinkedIn</label>
          <input type="url" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="https://www.linkedin.com/in/…" className={inputCls} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>URL avatar (optionnel)</label>
          <input type="url" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://…/photo.jpg" className={inputCls} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>Compte Claude ouvert le</label>
          <input type="date" value={claudeSince} onChange={(e) => setClaudeSince(e.target.value)} className={inputCls} />
        </div>
        <button type="submit" disabled={saving} className="mt-1 rounded-full bg-gradient-to-r from-orange-500 to-rose-500 px-8 py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-50">
          {saving ? "Enregistrement…" : profile ? "Enregistrer" : "Réserver mon handle 🔥"}
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
        <ClaudeSync
          profileId={profile.id}
          onSynced={() => loadProfile(session.user.id)}
        />
      )}

      {profile && (
        <form onSubmit={burnTokens} className="flex flex-col gap-4 border-t border-zinc-800 pt-8">
          <h2 className="text-xl font-bold">Ajouter des tokens brûlés</h2>
          <p className="text-sm text-zinc-500">
            En attendant la synchro automatique avec l&apos;API Anthropic, déclare ta
            conso ici — ton compteur public se met à jour en direct.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Tokens input</label>
              <input type="number" min="0" value={inputTokens} onChange={(e) => setInputTokens(e.target.value)} placeholder="0" className={inputCls} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Tokens output</label>
              <input type="number" min="0" value={outputTokens} onChange={(e) => setOutputTokens(e.target.value)} placeholder="0" className={inputCls} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Modèle</label>
            <select value={model} onChange={(e) => setModel(e.target.value)} className={inputCls}>
              {MODELS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={burning} className="rounded-full border border-orange-500/40 px-8 py-3 font-semibold text-orange-300 transition hover:bg-orange-500/10 disabled:opacity-50">
            {burning ? "En cours…" : "Brûler 🔥"}
          </button>
          {burnMsg && <p className="text-sm text-zinc-300">{burnMsg}</p>}
        </form>
      )}
    </main>
  );
}
