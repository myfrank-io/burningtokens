import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProfileView from "@/components/ProfileView";

// Liens canoniques iBurned : iburned.my/1000tokens/joseph.lecomte
// Le premier segment doit être "<nombre>tokens" ; le second est le handle.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ handle: string; sub: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { sub } = await params;
  return {
    title: `@${sub} — iBurned`,
    description: `Tokens Anthropic brûlés en direct par @${sub} sur iBurned.`,
  };
}

export default async function TokensProfilePage({ params }: Props) {
  const { handle: prefix, sub } = await params;
  if (!/^\d+tokens$/i.test(prefix)) notFound();
  return <ProfileView handle={sub} />;
}
