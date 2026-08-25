import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "iBurned",
  description:
    "Le link-in-bio qui affiche en direct le nombre de tokens que vous avez brûlés sur Anthropic depuis l'ouverture de votre compte Claude.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body className="antialiased min-h-screen">{children}</body>
    </html>
  );
}
