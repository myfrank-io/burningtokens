import Link from "next/link";
import { createSupabaseClient } from "@/lib/supabase";

export const revalidate = 60;

function formatTokens(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(n);
}

export default async function Home() {
  const supabase = createSupabaseClient();
  const { data: totals } = await supabase
    .from("profile_burn_totals")
    .select("total_tokens")
    .order("total_tokens", { ascending: false });

  const globalTotal =
    totals?.reduce((sum, row) => sum + Number(row.total_tokens ?? 0), 0) ?? 0;

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-10 px-6 py-20 text-center">
      <div className="flicker text-6xl">🔥</div>

      <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl">
        <span className="flame-text">iBurned</span>
      </h1>

      <p className="max-w-xl text-lg text-zinc-300">
        Le link-in-bio pour LinkedIn qui affiche <strong>en direct</strong> le
        nombre de tokens que vous avez brûlés sur Anthropic depuis l&apos;ouverture
        de votre compte Claude.
      </p>

      <code className="rounded-full border border-zinc-800 bg-zinc-900/60 px-5 py-2 text-sm text-orange-300">
        iburned.my/1000tokens/joseph.lecomte
      </code>

      {globalTotal > 0 && (
        <div className="flame-glow rounded-2xl border border-orange-500/20 bg-zinc-900/60 px-8 py-6">
          <div className="text-sm uppercase tracking-widest text-zinc-400">
            Tokens brûlés sur la plateforme
          </div>
          <div className="mt-2 text-4xl font-bold tabular-nums text-orange-300">
            {formatTokens(globalTotal)}
          </div>
        </div>
      )}

      <div className="flex flex-col items-center gap-4 sm:flex-row">
        <Link
          href="/login"
          className="rounded-full bg-gradient-to-r from-orange-500 to-rose-500 px-8 py-3 font-semibold text-white transition hover:opacity-90"
        >
          Réserver mon handle 🔥
        </Link>
        <Link
          href="/demo"
          className="rounded-full border border-zinc-700 px-8 py-3 font-semibold text-zinc-300 transition hover:border-orange-500/50 hover:text-white"
        >
          Voir un profil démo →
        </Link>
      </div>

      <section className="mt-8 grid gap-6 text-left sm:grid-cols-3">
        {[
          {
            step: "1",
            title: "Créez votre profil",
            text: "Connectez-vous avec LinkedIn et réservez votre handle iBurned.",
          },
          {
            step: "2",
            title: "Branchez votre terminal",
            text: "Une commande, et votre conso Claude Code exacte est synchronisée depuis le début.",
          },
          {
            step: "3",
            title: "Flexez en direct",
            text: "Votre compteur brûle en live sous les yeux de vos visiteurs.",
          },
        ].map((item) => (
          <div
            key={item.step}
            className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5"
          >
            <div className="text-sm font-bold text-orange-400">
              Étape {item.step}
            </div>
            <div className="mt-1 font-semibold">{item.title}</div>
            <p className="mt-2 text-sm text-zinc-400">{item.text}</p>
          </div>
        ))}
      </section>

      <footer className="mt-10 text-sm text-zinc-500">
        iBurned — propulsé par Claude &amp; Supabase — myfrank.io
      </footer>
    </main>
  );
}
