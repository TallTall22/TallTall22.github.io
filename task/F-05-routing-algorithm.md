# F-05: Routing Algorithm — BDD Decomposition & Atomic Tasks

> **BDD Requirements Expert output** | 2026-04-11  
> Status legend: ⬜ pending · 🔄 in progress · ✅ done · 🚫 blocked

---

## Executive Summary

**What**: Given a filtered list of 2026 MLB home games and a starting stadium, build a
greedy itinerary that maximises games attended while minimising travel distance.

**Why**: Core value proposition of the app — the user sees a concrete, traversable route.

**Scope IN**:
- Haversine distance calculation
- Stadium map lookup (teamId → Stadium)
- Greedy "pick nearest game" algorithm per calendar day
- Travel-day marker insertion
- Trip object assembly (qualityScore, totalDistance)
- Reactive composable that writes to `tripStore.selectedTrip`

**Scope OUT** (future):
- Global-optimum TSP solver
- Multi-trip alternatives / ranking
- Flight/train API integration

---

## Given-When-Then Scenarios

### Scenario 1: Happy Path — itinerary generated

- **Given**: `tripStore.homeStadiumId = "NYY"`, `startDate = "2026-04-15"`,
  `endDate = "2026-04-20"`, `filteredGames` contains 6 home games
- **When**: `tripGenerationRequestId` increments (F-03 hook fires)
- **Then**:
  - `useGameFilter` produces `filteredGames`
  - `useRoutingAlgorithm` runs greedy algorithm
  - `tripStore.selectedTrip` is populated with a `Trip` object
  - `itinerary` contains `GameDay` + `TravelDay` entries for every calendar day
  - `totalDistance` = sum of distances between consecutive game stadiums
  - `qualityScore` reflects games-to-days ratio

### Scenario 2: No games in range

- **Given**: `filteredGames = []` (no games in selected date range)
- **When**: routing runs
- **Then**: `routingError = "EMPTY_ITINERARY"`, `selectedTrip = null`, no crash

### Scenario 3: Home stadium not found

- **Given**: `homeStadiumId` references a teamId not present in `stadiums.json`
- **When**: routing runs
- **Then**: `routingError = "NO_HOME_STADIUM"`, `selectedTrip = null`

### Scenario 4: Stadium service fails

- **Given**: `loadStadiums()` throws / returns `FETCH_FAILED`
- **When**: routing runs
- **Then**: `routingError = "STADIUM_LOAD_FAILED"`, `selectedTrip = null`

### Scenario 5: Race condition — rapid date changes

- **Given**: User changes dates rapidly (3 requests in 200ms)
- **When**: Only the last request completes
- **Then**: Stale earlier results are discarded; `isRouting` resets correctly

### Scenario 6: All days have games (dense schedule)

- **Given**: Every day in the range has ≥1 home game
- **When**: Routing runs
- **Then**: All `TripDay`s are `GameDay`; no `TravelDay` inserted; greedy picks
  nearest stadium each day

---

## Technical Feasibility Assessment

| Concern           | Finding                                              | Mitigation                                         |
| ----------------- | ---------------------------------------------------- | -------------------------------------------------- |
| Race Condition    | `useRoutingAlgorithm` watches reactive `filteredGames` + `homeStadiumId` | requestId version stamp (same pattern as F-04) |
| Prop Drilling     | None — composable writes directly to `tripStore`    | Pinia store as single sink                        |
| Type Safety       | `ScoredCandidate` needs `game`, `stadium`, `score`  | Explicit interfaces in `models.ts`                |
| Performance       | Greedy is O(D × G) where D=days, G=games; max 180×2430≈438k ops | Acceptable; no memoisation needed |
| Error Handling    | Stadium load failure must not crash the app         | `RoutingResult.error` union + null-safe guards     |
| State Persistence | Trip written to Pinia; persisted in F-10 (out of scope here) | Write to `selectedTrip` ref only               |
| homeStadiumId key | Store uses `Stadium.id` ("NYY"); games use `Stadium.teamId` ("147") | Two separate Map lookups; clearly documented |

---

## Phase 1: Type System & Data Contracts ✅

**File**: `src/types/models.ts` (append to end)

### 1.1 — Routing domain types ✅

Add these interfaces/types to the bottom of `src/types/models.ts`:

```typescript
// ── F-05: Routing Algorithm Types ────────────────────────────────────────────

export interface RoutingOptions {
  startDate:     ISODateString;
  endDate:       ISODateString;
  /** Stadium.id (e.g. "NYY") — matches tripStore.homeStadiumId */
  homeStadiumId: string;
}

/**
 * A game candidate scored during the greedy pass.
 * score > 0 means reachable; higher = closer/better.
 */
export interface ScoredCandidate {
  game:        Game;
  stadium:     Stadium;
  distanceKm:  number;
  score:       number;
}

export type RoutingAlgorithmErrorCode =
  | 'NO_HOME_STADIUM'     // homeStadiumId not found in stadiums list
  | 'NO_GAMES'            // filteredGames is empty
  | 'STADIUM_LOAD_FAILED' // loadStadiums() returned an error
  | 'EMPTY_ITINERARY';    // algorithm produced 0 days (shouldn't happen with valid input)

export interface RoutingResult {
  trip:               Trip | null;
  error:              RoutingAlgorithmErrorCode | null;
  totalGamesAttended: number;
  totalTravelDays:    number;
}
```

---

## Phase 2: Pure Algorithm Functions ✅

**File**: `src/utils/routingAlgorithm.ts` (new file)

All functions are **pure** (no side effects, no imports from Vue/Pinia).  
Export everything for unit testing.

### 2.1 — `haversineDistance(a, b): number` ✅

Returns distance in **kilometres** between two lat/lng points.

```typescript
const EARTH_RADIUS_KM = 6371;

function toRadians(deg: number): number { return (deg * Math.PI) / 180; }

export function haversineDistance(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const dLat  = toRadians(b.lat - a.lat);
  const dLng  = toRadians(b.lng - a.lng);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const chord   = sinDLat ** 2 + Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * sinDLng ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(chord));
}
```

### 2.2 — `daysBetween(a, b): number` ✅

Returns calendar-day difference (b − a). Uses local date parts to avoid UTC offset.

```typescript
export function daysBetween(a: ISODateString, b: ISODateString): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  const msA = new Date(ay, (am as number) - 1, ad).getTime();
  const msB = new Date(by, (bm as number) - 1, bd).getTime();
  return Math.round((msB - msA) / 86_400_000);
}
```

### 2.3 — `buildStadiumByTeamIdMap(stadiums): Map<string, Stadium>` ✅

```typescript
export function buildStadiumByTeamIdMap(stadiums: Stadium[]): Map<string, Stadium> {
  const map = new Map<string, Stadium>();
  for (const s of stadiums) { map.set(s.teamId, s); }
  return map;
}
```

### 2.4 — `buildStadiumByIdMap(stadiums): Map<string, Stadium>` ✅

```typescript
export function buildStadiumByIdMap(stadiums: Stadium[]): Map<string, Stadium> {
  const map = new Map<string, Stadium>();
  for (const s of stadiums) { map.set(s.id, s); }
  return map;
}
```

### 2.5 — `scoreGameCandidates(games, currentStadium, byTeamId): ScoredCandidate[]` ✅

For a list of games on a single day, score each based on distance from
`currentStadium`. Unresolvable stadiums (teamId missing from map) are filtered out.

```typescript
const MAX_REACH_PER_DAY_KM = 5000; // any MLB park reachable in 1 flight day

export function scoreGameCandidates(
  games: Game[],
  currentStadium: Stadium,
  byTeamId: Map<string, Stadium>,
): ScoredCandidate[] {
  const candidates: ScoredCandidate[] = [];
  for (const game of games) {
    const stadium = byTeamId.get(game.homeTeamId);
    if (stadium === undefined) continue;                    // data integrity guard
    const distanceKm = haversineDistance(currentStadium.coordinates, stadium.coordinates);
    const score = MAX_REACH_PER_DAY_KM - distanceKm;       // higher = closer = better
    candidates.push({ game, stadium, distanceKm, score });
  }
  return candidates;
}
```

### 2.6 — `formatDateLocal(d: Date): ISODateString` ✅

Formats a Date as "YYYY-MM-DD" using **local** date parts (no UTC shift).

```typescript
export function formatDateLocal(d: Date): ISODateString {
  const y  = d.getFullYear();
  const m  = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}
```

### 2.7 — `buildItinerary(...)` — Greedy Core ✅

This is the central algorithm. Iterates every calendar day in `[startDate, endDate]`,
picks the closest game each day, inserts TravelDay for days without games.

```typescript
export function buildItinerary(
  filteredGames:   Game[],
  homeStadium:     Stadium,
  byTeamId:        Map<string, Stadium>,
  startDate:       ISODateString,
  endDate:         ISODateString,
): TripDay[] {
  // Group games by date
  const gamesByDate = new Map<ISODateString, Game[]>();
  for (const game of filteredGames) {
    const list = gamesByDate.get(game.date) ?? [];
    list.push(game);
    gamesByDate.set(game.date, list);
  }

  const itinerary: TripDay[] = [];
  let dayNumber      = 1;
  let currentStadium = homeStadium;

  const [sy, sm, sd] = startDate.split('-').map(Number);
  const [ey, em, ed] = endDate.split('-').map(Number);
  const start = new Date(sy, (sm as number) - 1, sd);
  const end   = new Date(ey, (em as number) - 1, ed);

  for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    const dateStr   = formatDateLocal(cursor);
    const gamesOnDay = gamesByDate.get(dateStr);

    if (!gamesOnDay || gamesOnDay.length === 0) {
      // Travel / rest day
      itinerary.push({
        type:      'travel_day',
        dayNumber,
        date:      dateStr,
        stadiumId: currentStadium.id,
      } satisfies TravelDay);
    } else {
      // Score candidates and pick best (greedy: closest)
      const candidates = scoreGameCandidates(gamesOnDay, currentStadium, byTeamId);

      if (candidates.length === 0) {
        // All games on this day have unresolvable stadiums → treat as travel day
        itinerary.push({
          type:      'travel_day',
          dayNumber,
          date:      dateStr,
          stadiumId: currentStadium.id,
        } satisfies TravelDay);
      } else {
        const best              = candidates.reduce((a, b) => a.score > b.score ? a : b);
        const prevStadium       = currentStadium;
        currentStadium          = best.stadium;
        const distanceFromPrev  = haversineDistance(prevStadium.coordinates, currentStadium.coordinates);

        itinerary.push({
          type:                 'game_day',
          dayNumber,
          date:                 dateStr,
          stadiumId:            currentStadium.id,
          game:                 best.game,
          distanceFromPrevious: Math.round(distanceFromPrev),
          estimatedTravelTime:  estimateTravelMinutes(distanceFromPrev),
        } satisfies GameDay);
      }
    }
    dayNumber++;
  }

  return itinerary;
}
```

### 2.8 — `estimateTravelMinutes(distanceKm): number` ✅

Simple heuristic: < 200 km → drive, else → fly.

```typescript
export function estimateTravelMinutes(distanceKm: number): number {
  if (distanceKm < 1) return 0;
  if (distanceKm < 200) {
    return Math.round(distanceKm / 100 * 60); // ~60 min per 100km driving
  }
  return Math.round(distanceKm / 800 * 60 + 120); // flight: 800km/h + 2hr overhead
}
```

### 2.9 — `assembleTripFromItinerary(itinerary, options): Trip` ✅

Builds the final `Trip` object from a completed itinerary.

```typescript
export function assembleTripFromItinerary(
  itinerary: TripDay[],
  options:   RoutingOptions,
): Trip {
  const gameDays   = itinerary.filter((d): d is GameDay    => d.type === 'game_day');
  const travelDays = itinerary.filter((d): d is TravelDay  => d.type === 'travel_day');

  const totalDistance = gameDays.reduce((sum, d) => sum + (d.distanceFromPrevious ?? 0), 0);
  const totalDays     = itinerary.length;
  const qualityScore  = totalDays > 0
    ? Math.round((gameDays.length / totalDays) * 100)
    : 0;

  return {
    tripId:        crypto.randomUUID(),
    createdAt:     new Date().toISOString().slice(0, 10),
    startDate:     options.startDate,
    endDate:       options.endDate,
    homeStadiumId: options.homeStadiumId,
    itinerary,
    totalDistance: Math.round(totalDistance),
    qualityScore,
  };
}
```

---

## Phase 3: Routing Service ✅

**File**: `src/services/routingService.ts` (new file)

### 3.1 — `computeTrip(filteredGames, options): Promise<RoutingResult>` ✅

Orchestrates: load stadiums → validate inputs → run algorithm → return result.
Follows injectable-loader pattern from `gameService.ts` for testability.

```typescript
import { loadStadiums } from '@/services/stadiumService';
import {
  buildStadiumByTeamIdMap,
  buildStadiumByIdMap,
  buildItinerary,
  assembleTripFromItinerary,
} from '@/utils/routingAlgorithm';
import type { Game, RoutingOptions, RoutingResult } from '@/types/models';

export async function computeTrip(
  filteredGames: Game[],
  options:       RoutingOptions,
): Promise<RoutingResult> {
  // Guard: no games
  if (filteredGames.length === 0) {
    return { trip: null, error: 'NO_GAMES', totalGamesAttended: 0, totalTravelDays: 0 };
  }

  // Load stadiums
  const stadiumResult = await loadStadiums();
  if (stadiumResult.error !== null) {
    return { trip: null, error: 'STADIUM_LOAD_FAILED', totalGamesAttended: 0, totalTravelDays: 0 };
  }

  const { stadiums } = stadiumResult;
  const byId     = buildStadiumByIdMap(stadiums);
  const byTeamId = buildStadiumByTeamIdMap(stadiums);

  // Guard: home stadium not found
  const homeStadium = byId.get(options.homeStadiumId);
  if (homeStadium === undefined) {
    return { trip: null, error: 'NO_HOME_STADIUM', totalGamesAttended: 0, totalTravelDays: 0 };
  }

  const itinerary = buildItinerary(filteredGames, homeStadium, byTeamId, options.startDate, options.endDate);

  if (itinerary.length === 0) {
    return { trip: null, error: 'EMPTY_ITINERARY', totalGamesAttended: 0, totalTravelDays: 0 };
  }

  const trip            = assembleTripFromItinerary(itinerary, options);
  const totalGamesAttended = itinerary.filter((d) => d.type === 'game_day').length;
  const totalTravelDays    = itinerary.filter((d) => d.type === 'travel_day').length;

  return { trip, error: null, totalGamesAttended, totalTravelDays };
}
```

---

## Phase 4: Composable ✅

**File**: `src/composables/useRoutingAlgorithm.ts` (new file)

### 4.1 — Interface definition ✅

```typescript
export interface UseRoutingAlgorithmReturn {
  generatedTrip: Ref<Trip | null>;
  isRouting:     Ref<boolean>;
  routingError:  Ref<RoutingAlgorithmErrorCode | null>;
}
```

### 4.2 — Composable implementation ✅

Watches `filteredGames` (from `useGameFilter`) AND `homeStadiumId` (from store).
Uses requestId version stamp for race-condition protection (same pattern as `useGameFilter`).

**Key**: Call `useGameFilter()` inside the composable; do NOT accept `filteredGames` as a prop.
The composable owns the full F-04→F-05 pipeline.

```typescript
export function useRoutingAlgorithm(): UseRoutingAlgorithmReturn {
  const store = useTripStore();
  const { homeStadiumId, startDate, endDate, tripGenerationRequestId } = storeToRefs(store);

  const { filteredGames } = useGameFilter();

  const generatedTrip = ref<Trip | null>(null);
  const isRouting     = ref<boolean>(false);
  const routingError  = ref<RoutingAlgorithmErrorCode | null>(null);

  let requestCounter = 0;
  let isMounted = true;
  onBeforeUnmount(() => { isMounted = false; });

  async function runRouting(requestId: number): Promise<void> {
    if (!homeStadiumId.value || !startDate.value || !endDate.value) {
      if (requestId === requestCounter) {
        isRouting.value = false;
      }
      return;
    }

    isRouting.value    = true;
    routingError.value = null;

    const result = await computeTrip(filteredGames.value, {
      startDate:     startDate.value,
      endDate:       endDate.value,
      homeStadiumId: homeStadiumId.value,
    });

    if (!isMounted || requestId !== requestCounter) return;

    if (result.error !== null) {
      routingError.value  = result.error;
      generatedTrip.value = null;
    } else {
      generatedTrip.value = result.trip;
      store.selectedTrip  = result.trip;
    }
    isRouting.value = false;
  }

  // Watch filteredGames — fires after useGameFilter finishes
  const stopWatcher = watch(
    filteredGames,
    () => {
      requestCounter++;
      void runRouting(requestCounter);
    },
    { deep: false, immediate: false },
  );

  onBeforeUnmount(() => { stopWatcher(); });

  return { generatedTrip, isRouting, routingError };
}
```

**Note**: `isRouting` is composable-local (not written to store) because F-05 loading
happens immediately after F-04 loading. The store's `isLoading` is managed by F-04.

---

## Phase 5: Tests ✅

### 5.1 — Pure function unit tests ✅

**File**: `src/utils/__tests__/routingAlgorithm.spec.ts` (new file)

Cover:
- `haversineDistance`: known city pairs (NY→LA ≈ 3940km, same point = 0)
- `daysBetween`: positive, negative, zero; timezone-safe
- `buildStadiumByTeamIdMap` / `buildStadiumByIdMap`: correct key, size
- `scoreGameCandidates`: filters unknown teamId, scores correctly, same stadium = highest score
- `estimateTravelMinutes`: 0km=0, <200km, >200km
- `formatDateLocal`: correct format, no UTC offset issue
- `buildItinerary`: empty games → all TravelDays; all same stadium; mixed; travel day inserted correctly
- `assembleTripFromItinerary`: correct qualityScore, totalDistance, UUID format

### 5.2 — Routing service tests ✅

**File**: `src/services/__tests__/routingService.spec.ts` (new file)

Cover:
- Happy path: valid inputs → `trip` returned with `error: null`
- Empty filteredGames → `error: "NO_GAMES"`
- Unknown homeStadiumId → `error: "NO_HOME_STADIUM"`
- `loadStadiums` failure → `error: "STADIUM_LOAD_FAILED"` (inject mock)

### 5.3 — Composable integration tests ✅

**File**: `src/composables/__tests__/useRoutingAlgorithm.integration.spec.ts` (new file)

Cover:
- `tripStore.selectedTrip` updated after `filteredGames` reactive change
- `isRouting` resets to `false` after completion
- Race condition: rapid `filteredGames` changes → only last result written
- `routingError` populated on NO_GAMES
- Unmount cleanup: no state update after unmount

---

## Implementation Notes

### Key Data Contract

```
Game.homeTeamId  → "147"    (numeric MLB teamId)
Stadium.teamId   → "147"    (matches Game.homeTeamId)  ← use for game→stadium lookup
Stadium.id       → "NYY"    (short code)               ← used in tripStore.homeStadiumId
Trip.homeStadiumId = "NYY"  (Stadium.id)
```

### Algorithm Complexity

```
D = total calendar days in range   (max 180)
G = filtered games count           (max ~2430, typically <<500 per range)
buildItinerary: O(D × G) — acceptable; no memoisation needed
```

### `satisfies` usage

Use `satisfies GameDay` and `satisfies TravelDay` when pushing to the `itinerary` array
so TypeScript validates the discriminated union branch at the call site.

### Files to create

```
src/utils/routingAlgorithm.ts                               [new]
src/services/routingService.ts                              [new]
src/composables/useRoutingAlgorithm.ts                      [new]
src/utils/__tests__/routingAlgorithm.spec.ts                [new]
src/services/__tests__/routingService.spec.ts               [new]
src/composables/__tests__/useRoutingAlgorithm.integration.spec.ts [new]
```

### Files to modify

```
src/types/models.ts   (append RoutingOptions, ScoredCandidate, RoutingAlgorithmErrorCode, RoutingResult)
```
