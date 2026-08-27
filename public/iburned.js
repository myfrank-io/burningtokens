#!/usr/bin/env node
/*
 * iBurned CLI — synchronise ta conso Claude Code vers ton compteur public.
 *
 * Synchro ponctuelle :
 *   curl -fsSL https://burningtokens.vercel.app/iburned.js | node - TON_TOKEN
 *
 * Synchro automatique (tous les soirs à 23h50 + à chaque démarrage,
 * rattrapage au réveil si la machine était éteinte) :
 *   curl -fsSL https://burningtokens.vercel.app/iburned.js | node - TON_TOKEN --install
 *
 * Désinstallation : … | node - --uninstall
 *
 * Le script lit les transcripts locaux de Claude Code (~/.claude/projects)
 * et n'envoie QUE des compteurs de tokens agrégés par jour — jamais ton
 * code, tes prompts ni tes conversations.
 */
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { execSync } = require("node:child_process");

const SCRIPT_URL = "https://burningtokens.vercel.app/iburned.js";
const INGEST_URL = "https://fziuboaggtxtewfvqbsb.supabase.co/functions/v1/ingest-cli";
const HOME = os.homedir();
const IBURNED_DIR = path.join(HOME, ".iburned");
const TOKEN_FILE = path.join(IBURNED_DIR, "token");
const SCRIPT_FILE = path.join(IBURNED_DIR, "sync.js");
const PLIST_FILE = path.join(HOME, "Library", "LaunchAgents", "my.iburned.sync.plist");

function readSavedToken() {
  try { return fs.readFileSync(TOKEN_FILE, "utf8").trim() || null; } catch { return null; }
}

function collectUsage() {
  const roots = [
    path.join(HOME, ".claude", "projects"),
    path.join(HOME, ".config", "claude", "projects"),
  ];
  const seen = new Set();
  // Totaux par (session, jour). L'identifiant de session est le nom du
  // fichier transcript : le serveur fait l'union — une même session vue
  // depuis plusieurs environnements (Mac, Cowork…) ne compte qu'une fois.
  const perSessionDay = new Map();
  let files = 0;

  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    let projects;
    try { projects = fs.readdirSync(root); } catch { continue; }
    for (const proj of projects) {
      const dir = path.join(root, proj);
      let entries;
      try { entries = fs.readdirSync(dir); } catch { continue; }
      for (const f of entries) {
        if (!f.endsWith(".jsonl")) continue;
        files++;
        const sessionId = f.slice(0, -6);
        let content;
        try { content = fs.readFileSync(path.join(dir, f), "utf8"); } catch { continue; }
        for (const line of content.split("\n")) {
          if (!line.trim()) continue;
          let e;
          try { e = JSON.parse(line); } catch { continue; }
          const u = e && e.message && e.message.usage;
          if (!u || !e.timestamp) continue;
          // Un même message peut apparaître sur plusieurs lignes (streaming) :
          // déduplication par (id du message, id de requête).
          const key = `${(e.message && e.message.id) || ""}:${e.requestId || ""}`;
          if (key !== ":" && seen.has(key)) continue;
          seen.add(key);
          const day = String(e.timestamp).slice(0, 10);
          if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
          const input =
            (u.input_tokens || 0) +
            (u.cache_creation_input_tokens || 0) +
            (u.cache_read_input_tokens || 0);
          const output = u.output_tokens || 0;
          if (input + output === 0) continue;
          const mapKey = `${sessionId}|${day}`;
          const cur = perSessionDay.get(mapKey) || { input: 0, output: 0 };
          cur.input += input;
          cur.output += output;
          perSessionDay.set(mapKey, cur);
        }
      }
    }
  }
  return { files, perSessionDay };
}

async function sync(token) {
  const { files, perSessionDay } = collectUsage();
  const sessions = [...perSessionDay.entries()].map(([key, t]) => {
    const [sessionId, date] = [key.slice(0, key.lastIndexOf("|")), key.slice(key.lastIndexOf("|") + 1)];
    return { session_id: sessionId, date, input_tokens: t.input, output_tokens: t.output };
  });
  const total = sessions.reduce((s, d) => s + d.input_tokens + d.output_tokens, 0);

  console.log(
    `🔥 iBurned — ${files} session(s) Claude Code trouvée(s) ici, ` +
      `${total.toLocaleString("fr-FR")} tokens. Envoi au compteur (chaque session ne compte qu'une fois, où qu'elle soit vue)…`,
  );
  if (!sessions.length) {
    console.log("Aucune consommation Claude Code trouvée sur cette machine.");
    return;
  }

  const res = await fetch(INGEST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, sessions }),
  });
  let out = {};
  try { out = await res.json(); } catch { /* réponse non JSON */ }
  if (!res.ok || out.error) {
    throw new Error(`Échec de l'envoi : ${out.error || `HTTP ${res.status}`}`);
  }
  console.log(`✓ Compteur mis à jour : ${Number(out.total).toLocaleString("fr-FR")} tokens au total (toutes machines confondues).`);
  if (out.link) console.log(`→ Ton lien du jour : ${out.link}`);
}

async function install(token) {
  fs.mkdirSync(IBURNED_DIR, { recursive: true });
  const res = await fetch(SCRIPT_URL);
  if (!res.ok) throw new Error(`Impossible de télécharger le script (HTTP ${res.status})`);
  fs.writeFileSync(SCRIPT_FILE, await res.text());
  fs.writeFileSync(TOKEN_FILE, token, { mode: 0o600 });

  const node = process.execPath;
  const logFile = path.join(IBURNED_DIR, "sync.log");

  if (process.platform === "darwin") {
    fs.mkdirSync(path.dirname(PLIST_FILE), { recursive: true });
    const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>my.iburned.sync</string>
  <key>ProgramArguments</key><array>
    <string>${node}</string>
    <string>${SCRIPT_FILE}</string>
  </array>
  <key>StartCalendarInterval</key><dict>
    <key>Hour</key><integer>23</integer>
    <key>Minute</key><integer>50</integer>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>StandardOutPath</key><string>${logFile}</string>
  <key>StandardErrorPath</key><string>${logFile}</string>
</dict></plist>
`;
    fs.writeFileSync(PLIST_FILE, plist);
    try { execSync(`launchctl unload "${PLIST_FILE}"`, { stdio: "ignore" }); } catch { /* pas encore chargé */ }
    execSync(`launchctl load "${PLIST_FILE}"`);
    console.log("✓ Synchro automatique installée (launchd) : tous les soirs à 23h50 + à chaque ouverture de session.");
    console.log("  Machine éteinte ou en veille à ce moment-là ? Rattrapage automatique au réveil.");
  } else if (process.platform === "linux") {
    let current = "";
    try { current = execSync("crontab -l", { stdio: ["ignore", "pipe", "ignore"] }).toString(); } catch { /* crontab vide */ }
    const kept = current.split("\n").filter((l) => l.trim() && !l.includes(SCRIPT_FILE));
    kept.push(`50 23 * * * "${node}" "${SCRIPT_FILE}" >> "${logFile}" 2>&1`);
    kept.push(`@reboot "${node}" "${SCRIPT_FILE}" >> "${logFile}" 2>&1`);
    execSync("crontab -", { input: kept.join("\n") + "\n" });
    console.log("✓ Synchro automatique installée (cron) : tous les soirs à 23h50 + à chaque démarrage.");
  } else {
    console.log("⚠ Installation automatique non prise en charge sur cette plateforme (Windows : utilise WSL,");
    console.log("  ou planifie « node %USERPROFILE%\\.iburned\\sync.js » dans le Planificateur de tâches).");
  }

  console.log("Première synchronisation…");
  await sync(token);
}

function uninstall() {
  if (process.platform === "darwin" && fs.existsSync(PLIST_FILE)) {
    try { execSync(`launchctl unload "${PLIST_FILE}"`, { stdio: "ignore" }); } catch { /* déjà déchargé */ }
    fs.rmSync(PLIST_FILE, { force: true });
  }
  if (process.platform === "linux") {
    try {
      const current = execSync("crontab -l", { stdio: ["ignore", "pipe", "ignore"] }).toString();
      const kept = current.split("\n").filter((l) => l.trim() && !l.includes(SCRIPT_FILE));
      execSync("crontab -", { input: kept.join("\n") + "\n" });
    } catch { /* pas de crontab */ }
  }
  fs.rmSync(IBURNED_DIR, { recursive: true, force: true });
  console.log("✓ iBurned désinstallé de cette machine (ton compteur en ligne est conservé).");
}

async function main() {
  const args = process.argv.slice(2);
  const flags = new Set(args.filter((a) => a.startsWith("--")));
  const argToken = args.find((a) => !a.startsWith("--")) || null;

  if (flags.has("--uninstall")) return uninstall();

  const token = argToken || readSavedToken();
  if (!token) {
    console.error("Usage : curl -fsSL https://burningtokens.vercel.app/iburned.js | node - TON_TOKEN [--install]");
    console.error("(récupère ton token dans ton dashboard iBurned)");
    process.exit(1);
  }

  if (flags.has("--install")) return install(token);
  return sync(token);
}

main().catch((e) => {
  console.error("Erreur :", (e && e.message) || e);
  process.exit(1);
});
