# 🔥 iburned

Synchronise ta consommation **Claude Code** (tokens exacts, depuis le début)
vers ton compteur public [iBurned](https://burningtokens.vercel.app) — le
link-in-bio des brûleurs de tokens.

## Utilisation

Récupère ton jeton personnel sur ton
[dashboard iBurned](https://burningtokens.vercel.app/dashboard), puis :

```bash
# Synchro + installation de l'agent quotidien (23h50 + à chaque démarrage) :
npx iburned@latest TON_JETON --install

# Synchro ponctuelle, sans rien installer :
npx iburned@latest TON_JETON

# Tout désinstaller :
npx iburned@latest --uninstall
```

## Ce que fait le script

- Lit les transcripts locaux de Claude Code (`~/.claude/projects` et
  `~/.config/claude/projects`) et agrège les compteurs de tokens par session
  et par jour
- N'envoie **que des compteurs** — jamais ton code, tes prompts ni tes
  conversations
- Chaque session Claude Code ne compte qu'une fois, même vue depuis
  plusieurs machines : le total est l'union de tout ce que tu as brûlé

Le code source vit dans
[`cli/iburned.js`](https://github.com/myfrank-io/burningtokens/blob/main/cli/iburned.js)
(miroir servi sur https://burningtokens.vercel.app/iburned.js).
