/**
 * fetch-games.mjs
 * Fetches the full 2026 MLB regular season schedule from the public MLB Stats API
 * and writes it to src/assets/data/games.json in the Game[] format.
 *
 * Usage: node task/fetch-games.mjs
 * Requires: Node 18+ (built-in fetch + top-level await)
 */

import { writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ── Timezone lookup from stadiums.json ───────────────────────────────────────

const stadiumsPath = join(__dirname, '../src/assets/data/stadiums.json');
const stadiums = JSON.parse(readFileSync(stadiumsPath, 'utf-8'));

/** Map: numeric teamId string → IANA timezone (e.g. "147" → "America/New_York") */
const tzByTeamId = new Map(stadiums.map((s) => [s.teamId, s.timeZone]));

// ── Helpers ───────────────────────────────────────────────────────────────────

function toLocalTime(utcIso, timeZone) {
  if (!utcIso || utcIso.endsWith('Z') === false && !utcIso.includes('+')) {
    return 'TBD';
  }
  const d = new Date(utcIso);
  if (isNaN(d.getTime())) return 'TBD';
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone,
  }).format(d);
}

function dayOfWeek(dateStr) {
  // Parse as local noon to avoid UTC-midnight timezone boundary issues
  return DAYS[new Date(dateStr + 'T12:00:00').getDay()];
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

const params = new URLSearchParams({
  sportId: '1',
  season: '2026',
  gameType: 'R',
  startDate: '2026-03-01',
  endDate: '2026-11-30',
  hydrate: 'team,venue',
});

const url = `https://statsapi.mlb.com/api/v1/schedule?${params}`;
console.log('⏳  Fetching MLB 2026 regular season schedule...');
console.log(`    ${url}\n`);

let payload;
try {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  payload = await res.json();
} catch (err) {
  console.error('❌  Fetch failed:', err.message);
  process.exit(1);
}

// ── Transform ─────────────────────────────────────────────────────────────────

const games = [];
let skipped = 0;

for (const dateEntry of payload.dates ?? []) {
  for (const g of dateEntry.games ?? []) {
    // Only regular season games
    if (g.gameType !== 'R') { skipped++; continue; }

    const homeId = String(g.teams.home.team.id);
    const awayId = String(g.teams.away.team.id);
    const dateStr = dateEntry.date; // "YYYY-MM-DD"
    const tz = tzByTeamId.get(homeId) ?? 'America/New_York';

    const entry = {
      gameId:         String(g.gamePk),
      date:           dateStr,
      dayOfWeek:      dayOfWeek(dateStr),
      homeTeamId:     homeId,
      awayTeamId:     awayId,
      startTimeLocal: toLocalTime(g.gameDate, tz),
      startTimeUtc:   g.gameDate ?? '',
      venue:          g.venue?.name ?? '',
    };

    if (g.seriesGameNumber != null && g.gamesInSeries != null) {
      entry.series = {
        seriesId:   `${g.gamePk}-series`,
        gameNumber: g.seriesGameNumber,
        maxGames:   g.gamesInSeries,
      };
    }

    games.push(entry);
  }
}

// Sort by date then startTimeUtc (matches F-04 sortByDate contract)
games.sort((a, b) => {
  const d = a.date.localeCompare(b.date);
  if (d !== 0) return d;
  return a.startTimeUtc.localeCompare(b.startTimeUtc);
});

// ── Dedup by gameId (safety net) ──────────────────────────────────────────────

const seen = new Map();
for (const g of games) seen.set(g.gameId, g);
const unique = Array.from(seen.values());
const dupsRemoved = games.length - unique.length;

// ── Write ─────────────────────────────────────────────────────────────────────

const outPath = join(__dirname, '../src/assets/data/games.json');
writeFileSync(outPath, JSON.stringify(unique, null, 2), 'utf-8');

console.log(`✅  Done!`);
console.log(`    Total games fetched : ${games.length}`);
if (dupsRemoved > 0) console.log(`    Duplicates removed  : ${dupsRemoved}`);
if (skipped > 0)     console.log(`    Non-regular skipped : ${skipped}`);
console.log(`    Written to          : ${outPath}`);
