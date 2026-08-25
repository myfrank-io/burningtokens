# 🔥 iBurned

Le link-in-bio pour utilisateurs LinkedIn qui affiche **en direct** le nombre de
tokens brûlés sur Anthropic depuis l'ouverture de leur compte Claude.

Domaine cible : **iburned.my** — liens utilisateurs au format
`iburned.my/1000tokens/joseph.lecomte` (tout préfixe `<nombre>tokens`
fonctionne, ainsi que `/joseph.lecomte` en accès direct).

## Stack

- **Next.js 15** (App Router, TypeScript, Tailwind CSS 4)
- **Supabase** — projet `burningtokens` (`fziuboaggtxtewfvqbsb`, région `eu-central-1`)
  - Postgres + Row Level Security
  - Realtime (le compteur se met à jour en live à chaque événement inséré)
- **Vercel** — déploiement continu depuis GitHub

## Pages

| Route | Description |
|---|---|
| `/` | Landing page + total global brûlé sur la plateforme |
| `/[handle]` | Profil public : compteur live, lien LinkedIn, estimation tokens/heure |
| `/1000tokens/[handle]` | Lien canonique du profil (tout préfixe `<nombre>tokens` est accepté) |
| `/demo` | Profil de démonstration (données seedées) |
| `/login` | Connexion « Sign in with LinkedIn » (Supabase Auth, provider `linkedin_oidc`) |
| `/dashboard` | Espace connecté : réserver/modifier son handle, éditer son profil, déclarer des tokens brûlés |

## Authentification

Uniquement via LinkedIn (`signInWithOAuth({ provider: "linkedin_oidc" })`),
session persistée côté navigateur. À la première connexion, un trigger crée
automatiquement le profil en récupérant le **nom** et la **photo** LinkedIn
depuis les métadonnées OIDC ; l'utilisateur personnalise ensuite son handle
sur `/dashboard`. Les handles acceptent les points (`joseph.lecomte`).
Les handles correspondant à des routes de l'app ou au motif `<nombre>tokens`
sont réservés (contraintes en base `handle_not_reserved` et
`profiles_handle_check`).

⚠️ Configuration requise (une seule fois) :

1. **LinkedIn Developers** (https://developer.linkedin.com → Create app) :
   ajouter le produit *« Sign In with LinkedIn using OpenID Connect »*, et
   dans Auth → Redirect URLs :
   `https://fziuboaggtxtewfvqbsb.supabase.co/auth/v1/callback`
2. **Supabase Dashboard** → Authentication → Sign In / Providers →
   **LinkedIn (OIDC)** : activer et coller le Client ID + Client Secret de
   l'app LinkedIn.
3. **Supabase Dashboard** → Authentication → URL Configuration :
   `Site URL = https://burningtokens.vercel.app`, et ajouter
   `https://burningtokens.vercel.app/dashboard` aux Redirect URLs.

## Modèle de données

- `profiles` — profils publics : `handle` unique, nom, headline, avatar,
  `linkedin_url`, `claude_since`, rattachement optionnel à `auth.users`
  (`user_id`). Un trigger crée automatiquement un profil à l'inscription.
- `usage_events` — événements de consommation (deltas `input_tokens` /
  `output_tokens`, modèle, source `manual | api_sync | import`).
- `profile_burn_totals` — vue d'agrégats par profil (totaux, premier/dernier
  événement).

**RLS** : lecture publique des profils `is_public` et de leurs événements ;
écriture réservée au propriétaire (`user_id = auth.uid()`).

## Variables d'environnement

Copier `.env.example` vers `.env.local`. Les deux valeurs (URL du projet et clé
*publishable*) sont publiques par conception — la sécurité repose sur RLS. Le
code contient ces valeurs par défaut, les variables d'environnement les
surchargent.

```
NEXT_PUBLIC_SUPABASE_URL=…
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=…
```

## Développement

```bash
npm install
npm run dev
```

## Prochaines étapes

- Synchronisation réelle de la consommation via l'Admin API Anthropic
  (clé d'admin d'organisation, jamais exposée côté client — à stocker en
  secret serveur / Edge Function)
- Badge / widget embarquable pour LinkedIn
