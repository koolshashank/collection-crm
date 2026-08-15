/**
 * lib/teamMappingStore.js — drag-and-drop Team Leader ↔ staff mapping for
 * the Team Mapping page. Distinct from lib/teamsStore.js (which stores
 * free-text agent_name rosters for the Team Performance report) — this
 * store is keyed by real employee IDs.
 * File: data/team_mapping.json = { tlIds: [id...], mapping: { [tlId]: [memberId...] } }
 */

import fs from "fs";
import path from "path";

const FILE_PATH = path.join(process.cwd(), "data", "team_mapping.json");

const DEFAULTS = { tlIds: [], mapping: {} };

function readAll() {
  try {
    const raw = fs.readFileSync(FILE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return {
        tlIds: Array.isArray(parsed.tlIds) ? parsed.tlIds : [],
        mapping: parsed.mapping && typeof parsed.mapping === "object" ? parsed.mapping : {},
      };
    }
  } catch {
    /* file doesn't exist yet / corrupt — defaults */
  }
  return { ...DEFAULTS, mapping: {} };
}

/** Dedupes and cross-checks so no id is ever a TL and a member, or under two TLs, at once. */
function normalize({ tlIds, mapping }) {
  const cleanTlIds = Array.from(new Set((tlIds || []).map(String).filter(Boolean)));
  const tlSet = new Set(cleanTlIds);
  const seenMembers = new Set();
  const cleanMapping = {};

  for (const tlId of cleanTlIds) {
    const members = Array.isArray(mapping?.[tlId]) ? mapping[tlId] : [];
    const cleanMembers = [];
    for (const raw of members) {
      const id = String(raw);
      if (!id || tlSet.has(id) || seenMembers.has(id)) continue; // no id is its own/another TL, no double-mapping
      seenMembers.add(id);
      cleanMembers.push(id);
    }
    cleanMapping[tlId] = cleanMembers;
  }

  return { tlIds: cleanTlIds, mapping: cleanMapping };
}

function writeAll(data) {
  const dir = path.dirname(FILE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2));
}

export function readTeamMapping() {
  return readAll();
}

export function writeTeamMapping(data) {
  const clean = normalize(data || {});
  writeAll(clean);
  return clean;
}
