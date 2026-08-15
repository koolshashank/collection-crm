/**
 * lib/teamsStore.js — reads/writes the team roster config.
 *
 * There's no "teams" concept in the real backend yet, so team-to-agent
 * mapping is defined and stored right here in the CRM, as a local JSON
 * file (same pattern as data/whatsapp_config.json, data/gateway_config.json).
 * Manage teams from the "+ Add Team" / edit / delete controls on the
 * Team Performance page.
 */

import fs from "fs";
import path from "path";

const FILE_PATH = path.join(process.cwd(), "data", "teams_config.json");

function readAll() {
  try {
    const raw = fs.readFileSync(FILE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.teams) ? parsed.teams : [];
  } catch {
    return []; // file doesn't exist yet — no teams configured
  }
}

function writeAll(teams) {
  const dir = path.dirname(FILE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(FILE_PATH, JSON.stringify({ teams }, null, 2));
}

export function listTeams() {
  return readAll();
}

/** Creates a new team (no id) or updates an existing one (id given). */
export function saveTeam({ id, name, lead_name, members }) {
  const teams = readAll();
  const cleanMembers = Array.from(new Set((members || []).map((m) => String(m).trim()).filter(Boolean)));

  if (id) {
    const idx = teams.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error("Team not found.");
    teams[idx] = { ...teams[idx], name, lead_name, members: cleanMembers };
  } else {
    const newId = `team_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    teams.push({ id: newId, name, lead_name, members: cleanMembers });
  }
  writeAll(teams);
  return readAll();
}

export function deleteTeam(id) {
  const teams = readAll().filter((t) => t.id !== id);
  writeAll(teams);
  return teams;
}
