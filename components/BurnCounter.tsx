"use client";

import { useEffect, useRef, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase";

type Props = {
  profileId: string;
  initialTotal: number;
  /** Rythme moyen (tokens/seconde) sur les 30 derniers jours, pour l'estimation live. */
  ratePerSecond: number;
};

export default function BurnCounter({
  profileId,
  initialTotal,
  ratePerSecond,
}: Props) {
  // `confirmed` = total réellement en base ; `display` = total affiché,
  // qui avance en continu au rythme moyen observé (estimation en direct).
  const confirmedRef = useRef(initialTotal);
  const [display, setDisplay] = useState(initialTotal);

  useEffect(() => {
    const interval = setInterval(() => {
      setDisplay((d) => Math.max(d + ratePerSecond / 10, confirmedRef.current));
    }, 100);
    return () => clearInterval(interval);
  }, [ratePerSecond]);

  useEffect(() => {
    const supabase = createSupabaseClient();
    const channel = supabase
      .channel(`burn-${profileId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "usage_events",
          filter: `profile_id=eq.${profileId}`,
        },
        (payload) => {
          const row = payload.new as {
            input_tokens: number;
            output_tokens: number;
          };
          confirmedRef.current +=
            Number(row.input_tokens) + Number(row.output_tokens);
          setDisplay((d) => Math.max(d, confirmedRef.current));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profileId]);

  return (
    <div className="mt-3">
      <div className="flame-text text-5xl font-extrabold tabular-nums sm:text-6xl">
        {new Intl.NumberFormat("fr-FR").format(Math.floor(display))}
      </div>
      {ratePerSecond > 0 && (
        <div className="mt-3 inline-flex items-center gap-2 text-xs text-zinc-500">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-orange-400" />
          estimation en direct · ~
          {new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(
            ratePerSecond * 3600
          )}{" "}
          tokens/heure
        </div>
      )}
    </div>
  );
}
