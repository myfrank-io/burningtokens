import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProfileView from "@/components/ProfileView";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  return {
    title: `@${handle} — iBurned`,
    description: `Tokens Anthropic brûlés en direct par @${handle} sur iBurned.`,
  };
}

export default async function ProfilePage({ params }: Props) {
  const { handle } = await params;
  // "127Mtokens" seul est un préfixe d'URL, pas un profil.
  if (/^\d+[km]?tokens$/i.test(handle)) notFound();
  return <ProfileView handle={handle} />;
}
