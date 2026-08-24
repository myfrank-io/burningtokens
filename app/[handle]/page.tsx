import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BurnCounter from "@/components/BurnCounter";
import { createSupabaseClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  return {
    title: `@${handle} — Burning Tokens`,
    description: `Tokens Anthropic brûlés en direct par @${handle}.`,
  };
}

export default async function ProfilePage({ params }: Props) {
  const { handle } = await params;
  const supabase = createSupabaseClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, handle, display_name, headline, avatar_url, linkedin_url, claude_since"
    )
    .eq("handle", handle.toLowerCase())
    .maybeSingle();

  if (!profile) notFound();

  const { data: totals } = await supabase
    .from("profile_burn_totals")
    .select("total_tokens, input_tokens, output_tokens, events, last_event_at")
    .eq("profile_id", profile.id)
    .maybeSingle();

  const totalTokens = Number(totals?.total_tokens ?? 0);

  // Rythme moyen sur les 30 derniers jours pour l'estimation "live".
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  const { data: recent } = await supabase
    .from("usage_events")
    .select("input_tokens, output_tokens")
    .eq("profile_id", profile.id)
    .gte("occurred_at", thirtyDaysAgo);

  const recentTotal =
    recent?.reduce(
      (sum, e) => sum + Number(e.input_tokens) + Number(e.output_tokens),
      0
    ) ?? 0;
  const ratePerSecond = recentTotal / (30 * 24 * 3600);

  const memberSince = profile.claude_since
    ? new Date(profile.claude_since).toLocaleDateString("fr-FR", {
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-8 px-6 py-16 text-center">
      {profile.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={profile.avatar_url}
          alt={profile.display_name}
          className="h-24 w-24 rounded-full border-2 border-orange-500/40 object-cover"
        />
      ) : (
        <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-orange-500/40 bg-zinc-900 text-4xl">
          🔥
        </div>
      )}

      <div>
        <h1 className="text-3xl font-bold">{profile.display_name}</h1>
        <div className="mt-1 text-zinc-400">@{profile.handle}</div>
        {profile.headline && (
          <p className="mt-3 text-zinc-300">{profile.headline}</p>
        )}
      </div>

      <div className="flame-glow w-full rounded-3xl border border-orange-500/20 bg-zinc-900/70 px-6 py-10">
        <div className="text-xs uppercase tracking-[0.3em] text-zinc-400">
          Tokens brûlés sur Anthropic
        </div>
        <BurnCounter
          profileId={profile.id}
          initialTotal={totalTokens}
          ratePerSecond={ratePerSecond}
        />
        {memberSince && (
          <div className="mt-4 text-sm text-zinc-500">
            depuis l&apos;ouverture de son compte Claude ({memberSince})
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {profile.linkedin_url && (
          <a
            href={profile.linkedin_url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-[#0a66c2] px-6 py-2.5 font-semibold text-white transition hover:opacity-90"
          >
            in&nbsp; LinkedIn
          </a>
        )}
        <Link
          href="/"
          className="rounded-full border border-zinc-700 px-6 py-2.5 text-zinc-300 transition hover:border-orange-500/50 hover:text-white"
        >
          Créer mon compteur 🔥
        </Link>
      </div>

      <footer className="mt-6 text-xs text-zinc-600">
        burningtokens · compteur mis à jour en direct
      </footer>
    </main>
  );
}
