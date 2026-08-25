"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Déjà connecté ? Direction le dashboard.
    const supabase = getSupabaseBrowser();
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/dashboard");
    });
    // Erreur renvoyée par le callback OAuth (provider mal configuré, refus…).
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const desc = hash.get("error_description");
    if (desc) setError(desc.replace(/\+/g, " "));
  }, [router]);

  async function signInWithLinkedIn() {
    setLoading(true);
    setError(null);
    const supabase = getSupabaseBrowser();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "linkedin_oidc",
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-8 px-6 py-16 text-center">
      <Link href="/" className="flicker text-5xl">
        🔥
      </Link>
      <div>
        <h1 className="text-3xl font-bold">
          <span className="flame-text">Réserver mon handle</span>
        </h1>
        <p className="mt-3 text-zinc-400">
          Connecte-toi avec ton compte LinkedIn — c&apos;est lui que ton compteur
          mettra en avant.
        </p>
      </div>

      <button
        onClick={signInWithLinkedIn}
        disabled={loading}
        className="flex w-full items-center justify-center gap-3 rounded-full bg-[#0a66c2] px-8 py-3.5 font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden>
          <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45z" />
        </svg>
        {loading ? "Redirection…" : "Continuer avec LinkedIn"}
      </button>

      {error && <p className="text-sm text-rose-400">{error}</p>}

      <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300">
        ← Retour
      </Link>
    </main>
  );
}
