# 🔥 Burning Tokens

Le link-in-bio pour utilisateurs LinkedIn qui affiche **en direct** le nombre de
tokens brûlés sur Anthropic depuis l'ouverture de leur compte Claude.

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
| `/demo` | Profil de démonstration (données seedées) |

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

- Authentification (magic link) + onboarding "réserver mon handle"
- Synchronisation réelle de la consommation via l'Admin API Anthropic
  (clé d'admin d'organisation, jamais exposée côté client — à stocker en
  secret serveur / Edge Function)
- Badge / widget embarquable pour LinkedIn
