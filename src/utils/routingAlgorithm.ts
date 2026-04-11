// src/utils/routingAlgorithm.ts
// Pure functions only — NO Vue/Pinia imports. Every export is unit-testable.

import type {
  Game,
  Stadium,
  TripDay,
  GameDay,
  TravelDay,
  RoutingOptions,
  ScoredCandidate,
  Trip,
  ISODateString,
} from '@/types/models';

const EARTH_RADIUS_KM    = 6_371;
const MAX_REACH_KM       = 5_000; // any CONUS + Toronto stadium reachable in 1 flight day
const DRIVE_MAX_KM       = 200;   // threshold below which driving is faster than flying
const DRIVE_SPEED_KMH    = 100;   // approximate driving speed (km/h)
const FLIGHT_SPEED_KMH   = 800;   // approximate cruising speed (km/h)
const FLIGHT_OVERHEAD_MIN = 120;  // airport overhead: check-in + boarding + deplaning (min)

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Returns distance in kilometres between two lat/lng coordinates (Haversine formula).
 */
export function haversineDistance(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const dLat    = toRadians(b.lat - a.lat);
  const dLng    = toRadians(b.lng - a.lng);
  const sinHLat = Math.sin(dLat / 2);
  const sinHLng = Math.sin(dLng / 2);
  const chord   =
    sinHLat ** 2 +
    Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * sinHLng ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(chord));
}

/**
 * Returns the calendar-day difference (b − a) using LOCAL date parts.
 * Safe across all UTC offset timezones (no toISOString conversion).
 */
export function daysBetween(a: ISODateString, b: ISODateString): number {
  const [ay, am, ad] = a.split('-').map(Number) as [number, number, number];
  const [by, bm, bd] = b.split('-').map(Number) as [number, number, number];
  const msA = new Date(ay, am - 1, ad).getTime();
  const msB = new Date(by, bm - 1, bd).getTime();
  return Math.round((msB - msA) / 86_400_000);
}

/**
 * Returns a "YYYY-MM-DD" string from a Date using LOCAL date parts.
 * Never use toISOString() — UTC conversion causes off-by-1 in positive-offset timezones.
 */
export function formatDateLocal(d: Date): ISODateString {
  const y  = d.getFullYear();
  const m  = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/** Maps Stadium.teamId → Stadium (for game→stadium lookup). */
export function buildStadiumByTeamIdMap(stadiums: Stadium[]): Map<string, Stadium> {
  const map = new Map<string, Stadium>();
  for (const s of stadiums) {
    map.set(s.teamId, s);
  }
  return map;
}

/** Maps Stadium.id → Stadium (for homeStadiumId lookup). */
export function buildStadiumByIdMap(stadiums: Stadium[]): Map<string, Stadium> {
  const map = new Map<string, Stadium>();
  for (const s of stadiums) {
    map.set(s.id, s);
  }
  return map;
}

/**
 * Estimates travel time in minutes.
 * < 1 km → 0 min; < 200 km → drive estimate; else → flight estimate.
 */
export function estimateTravelMinutes(distanceKm: number): number {
  if (distanceKm < 1)          return 0;
  if (distanceKm < DRIVE_MAX_KM) return Math.round((distanceKm / DRIVE_SPEED_KMH) * 60);
  return Math.round((distanceKm / FLIGHT_SPEED_KMH) * 60 + FLIGHT_OVERHEAD_MIN);
}

/**
 * Scores a list of same-day games from the perspective of currentStadium.
 * Games whose homeTeamId is not in byTeamId are silently dropped (data-integrity guard).
 * Higher score = closer = better for the greedy algorithm.
 */
export function scoreGameCandidates(
  games:          Game[],
  currentStadium: Stadium,
  byTeamId:       Map<string, Stadium>,
): ScoredCandidate[] {
  const candidates: ScoredCandidate[] = [];
  for (const game of games) {
    const stadium = byTeamId.get(game.homeTeamId);
    if (stadium === undefined) continue;
    const distanceKm = haversineDistance(currentStadium.coordinates, stadium.coordinates);
    candidates.push({
      game,
      stadium,
      distanceKm,
      score: MAX_REACH_KM - distanceKm,
    });
  }
  return candidates;
}

/**
 * F-05 greedy core: iterates every calendar day in [startDate, endDate],
 * picks the closest game stadium each day, inserts TravelDays for game-free days.
 *
 * Algorithm properties:
 * - O(D × G) where D = days, G = filtered games (max 180 × ~500 = 90k ops — acceptable)
 * - Does NOT mutate inputs
 * - Uses local date arithmetic (no UTC offset issues)
 */
export function buildItinerary(
  filteredGames: Game[],
  homeStadium:   Stadium,
  byTeamId:      Map<string, Stadium>,
  startDate:     ISODateString,
  endDate:       ISODateString,
): TripDay[] {
  // Group games by date for O(1) per-day lookup
  const gamesByDate = new Map<ISODateString, Game[]>();
  for (const game of filteredGames) {
    const list = gamesByDate.get(game.date) ?? [];
    list.push(game);
    gamesByDate.set(game.date, list);
  }

  const itinerary: TripDay[] = [];
  let dayNumber      = 1;
  let currentStadium = homeStadium;

  const [sy, sm, sd] = startDate.split('-').map(Number) as [number, number, number];
  const [ey, em, ed] = endDate.split('-').map(Number)   as [number, number, number];
  const start = new Date(sy, sm - 1, sd);
  const end   = new Date(ey, em - 1, ed);

  for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    const dateStr    = formatDateLocal(cursor);
    const gamesOnDay = gamesByDate.get(dateStr);

    if (!gamesOnDay || gamesOnDay.length === 0) {
      // No games today → travel/rest day
      const travelDay: TravelDay = {
        type:      'travel_day',
        dayNumber,
        date:      dateStr,
        stadiumId: currentStadium.id,
      };
      itinerary.push(travelDay);
    } else {
      const candidates = scoreGameCandidates(gamesOnDay, currentStadium, byTeamId);

      if (candidates.length === 0) {
        // All games today have unresolvable stadiums → treat as travel day
        const travelDay: TravelDay = {
          type:      'travel_day',
          dayNumber,
          date:      dateStr,
          stadiumId: currentStadium.id,
        };
        itinerary.push(travelDay);
      } else {
        const best        = candidates.reduce((a, b) => (a.score > b.score ? a : b));
        const prevStadium = currentStadium;
        currentStadium    = best.stadium;
        const dist        = haversineDistance(prevStadium.coordinates, currentStadium.coordinates);

        const gameDay: GameDay = {
          type:                 'game_day',
          dayNumber,
          date:                 dateStr,
          stadiumId:            currentStadium.id,
          game:                 best.game,
          distanceFromPrevious: Math.round(dist),
          estimatedTravelTime:  estimateTravelMinutes(dist),
        };
        itinerary.push(gameDay);
      }
    }
    dayNumber++;
  }

  return itinerary;
}

/** Assembles a Trip object from a completed itinerary. */
export function assembleTripFromItinerary(
  itinerary:  TripDay[],
  options:    RoutingOptions,
  generateId: () => string = () => crypto.randomUUID(),
): Trip {
  const gameDays      = itinerary.filter((d): d is GameDay => d.type === 'game_day');
  const totalDistance = gameDays.reduce((sum, d) => sum + (d.distanceFromPrevious ?? 0), 0);
  const qualityScore  = itinerary.length > 0
    ? Math.round((gameDays.length / itinerary.length) * 100)
    : 0;

  return {
    tripId:        generateId(),
    createdAt:     formatDateLocal(new Date()),
    startDate:     options.startDate,
    endDate:       options.endDate,
    homeStadiumId: options.homeStadiumId,
    itinerary,
    totalDistance: Math.round(totalDistance),
    qualityScore,
  };
}
