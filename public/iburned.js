#!/usr/bin/env node
/*
 * iBurned CLI — synchronise ta conso Claude Code vers ton compteur public.
 *
 *   curl -fsSL https://burningtokens.vercel.app/iburned.js | node - TON_TOKEN
 *
 * Le script lit les transcripts locaux de Claude Code (~/.claude/projects)
 * et n'envoie QUE des compteurs de tokens agrégés par jour — jamais ton
 * code, tes prompts ni tes conversations.
 */
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const INGEST_URL = "https://fziuboaggtxtewfvqbsb.supabase.co/functions/v1/ingest-cli";

async function main() {
  const token = process.argv[2];
  if (!token) {
    console.error("Usage : curl -fsSL https://burningtokens.vercel.app/iburned.js | node - TON_TOKEN");
    console.error("(récupère ton token dans ton dashboard iBurned)");
    process.exit(1);
  }

  const roots = [
    path.join(os.homedir(), ".claude", "projects"),
    path.join(os.homedir(), ".config", "claude", "projects"),
  ];

  const seen = new Set();
  const daily = new Map();
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
          const cur = daily.get(day) || { input: 0, output: 0 };
          cur.input += input;
          cur.output += output;
          daily.set(day, cur);
        }
      }
    }
  }

  const days = [...daily.entries()]
    .sort()
    .map(([date, t]) => ({ date, input_tokens: t.input, output_tokens: t.output }));
  const total = days.reduce((s, d) => s + d.input_tokens + d.output_tokens, 0);

  console.log(
    `🔥 iBurned — ${files} session(s) Claude Code analysée(s), ` +
      `${days.length} jour(s) d'activité, ${total.toLocaleString("fr-FR")} tokens brûlés.`,
  );
  if (!days.length) {
    console.log("Aucune consommation Claude Code trouvée sur cette machine.");
    process.exit(0);
  }

  const res = await fetch(INGEST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, days }),
  });
  let out = {};
  try { out = await res.json(); } catch { /* réponse non JSON */ }
  if (!res.ok || out.error) {
    console.error("Échec de l'envoi :", out.error || `HTTP ${res.status}`);
    process.exit(1);
  }
  console.log(`✓ Compteur mis à jour : ${Number(out.total).toLocaleString("fr-FR")} tokens au total.`);
  if (out.link) console.log(`→ Ton lien du jour : ${out.link}`);
}

main().catch((e) => {
  console.error("Erreur :", (e && e.message) || e);
  process.exit(1);
});
