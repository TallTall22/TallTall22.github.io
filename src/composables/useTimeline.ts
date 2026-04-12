/**
 * F-08: useTimeline Composable
 *
 * Watches selectedTrip from useTripStore, loads stadium data, and maps
 * each TripDay into a TimelineDayViewModel for display in the timeline strip.
 *
 * Tasks: 2.1 (interface + composable shell), 4.1 (race condition guard),
 *        4.2 (resolveTeamByTeamId helper), 4.4 (null-trip synchronous reset)
 */

import { ref, watch, onBeforeUnmount } from 'vue';
import type { Ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useTripStore } from '@/stores/tripStore';
import { loadStadiums } from '@/services/stadiumService';
import { formatLocalTime, deriveDayOfWeek, extractTimeZoneAbbr } from '@/utils/timelineUtils';
import type { TimelineDayViewModel } from '@/types/components';
import type { Stadium, TripDay } from '@/types/models';

// ── Task 2.1: Return interface ────────────────────────────────────────────────

export interface UseTimelineReturn {
  timelineDays: Ref<TimelineDayViewModel[]>;
  isLoading:    Ref<boolean>;
  error:        Ref<string | null>;
}

// ── Task 4.2: Private team resolver ──────────────────────────────────────────

/**
 * Looks up a team by its numeric MLB teamId (Stadium.teamId) in the provided map.
 * Returns { nickname, logoUrl } on success; null on miss (with DEV warning).
 *
 * IMPORTANT: This uses Stadium.teamId (e.g. "147"), NOT Stadium.id (e.g. "NYY").
 * The two maps kept separately in buildTimelineDays make this lookup unambiguous.
 */
function resolveTeamByTeamId(
  teamId:  string,
  teamMap: Map<string, Stadium>,
): { nickname: string; logoUrl: string } | null {
  const stadium = teamMap.get(teamId);
  if (stadium === undefined) {
    if (import.meta.env.DEV) {
      console.warn('[useTimeline] teamId not found in stadiums:', teamId);
    }
    return null;
  }
  return { nickname: stadium.teamNickname, logoUrl: stadium.logoUrl };
}

// ── Pure mapper ───────────────────────────────────────────────────────────────

/**
 * Maps a single TripDay domain object to a TimelineDayViewModel for rendering.
 *
 * @param day            - domain TripDay (GameDay | TravelDay)
 * @param stadiumById    - Map keyed by Stadium.id (e.g. "NYY") — for stadiumId lookup
 * @param stadiumByTeamId - Map keyed by Stadium.teamId (e.g. "147") — for matchup lookup
 */
function mapTripDayToViewModel(
  day:              TripDay,
  stadiumById:      Map<string, Stadium>,
  stadiumByTeamId:  Map<string, Stadium>,
): TimelineDayViewModel {
  const dayOfWeek  = deriveDayOfWeek(day.date);
  const distanceKm = day.distanceFromPrevious ?? null;

  // ── Travel Day ───────────────────────────────────────────────────────────
  if (day.type === 'travel_day') {
    const stadiumId = day.stadiumId;
    const stadium   = stadiumId !== undefined ? stadiumById.get(stadiumId) : undefined;

    return {
      dayNumber:        day.dayNumber,
      date:             day.date,
      dayOfWeek,
      type:             'travel_day',
      matchupLabel:     null,
      localTime:        null,
      timeZoneAbbr:     null,
      stadiumName:      stadium?.stadiumName ?? null,
      city:             stadium?.city ?? null,
      homeTeamLogo:     '',
      awayTeamLogo:     '',
      homeTeamNickname: null,
      awayTeamNickname: null,
      distanceKm,
    };
  }

  // ── Game Day (TypeScript narrowed via discriminated union) ────────────────
  const gameStadium = stadiumById.get(day.stadiumId);

  const homeResolved = resolveTeamByTeamId(day.game.homeTeamId, stadiumByTeamId);
  const awayResolved = resolveTeamByTeamId(day.game.awayTeamId, stadiumByTeamId);

  const homeNickname = homeResolved?.nickname ?? 'Unknown';
  const awayNickname = awayResolved?.nickname ?? 'Unknown';
  const matchupLabel = `${awayNickname} @ ${homeNickname}`;

  // Format local time — pass IANA timezone from the resolved stadium
  const timeZone = gameStadium?.timeZone ?? '';
  const localTime = timeZone
    ? formatLocalTime(day.game.startTimeLocal, timeZone, day.date)
    : day.game.startTimeLocal;

  // Extract timezone abbreviation via Intl (DST-aware); null when no timezone available
  const finalTimeZoneAbbr: string | null = timeZone
    ? extractTimeZoneAbbr(timeZone, new Date(`${day.date}T18:00:00Z`)) || null
    : null;

  return {
    dayNumber:        day.dayNumber,
    date:             day.date,
    dayOfWeek,
    type:             'game_day',
    matchupLabel,
    localTime,
    timeZoneAbbr:     finalTimeZoneAbbr,
    stadiumName:      gameStadium?.stadiumName ?? null,
    city:             gameStadium?.city ?? null,
    homeTeamLogo:     homeResolved?.logoUrl ?? '',
    awayTeamLogo:     awayResolved?.logoUrl ?? '',
    homeTeamNickname: homeNickname,
    awayTeamNickname: awayNickname,
    distanceKm,
  };
}

// ── Task 2.1 / 4.1 / 4.4: Composable ─────────────────────────────────────────

export function useTimeline(): UseTimelineReturn {
  const store = useTripStore();
  const { selectedTrip } = storeToRefs(store);

  const timelineDays = ref<TimelineDayViewModel[]>([]);
  const isLoading    = ref<boolean>(false);
  const error        = ref<string | null>(null);

  // Stale-request guard — incremented on every watch trigger
  let requestCounter = 0;
  // Mount guard — prevents state mutations after component teardown
  let isMounted      = true;
  onBeforeUnmount(() => { isMounted = false; });

  async function buildTimelineDays(requestId: number): Promise<void> {
    const trip = selectedTrip.value;

    // Task 4.4: null trip → synchronous reset with NO isLoading flash
    if (trip === null) {
      if (isMounted && requestId === requestCounter) {
        timelineDays.value = [];
        isLoading.value    = false;
        error.value        = null;
      }
      return;
    }

    isLoading.value = true;
    error.value     = null;

    const { stadiums, error: loadError } = await loadStadiums();

    // Task 4.1: race condition guard — discard stale responses
    if (!isMounted || requestId !== requestCounter) return;

    if (loadError !== null) {
      error.value        = 'Stadium data unavailable. Please refresh.';
      timelineDays.value = [];
      isLoading.value    = false;
      return;
    }

    // Build TWO maps:
    //   stadiumById      → keyed by Stadium.id (e.g. "NYY")   — for GameDay.stadiumId lookup
    //   stadiumByTeamId  → keyed by Stadium.teamId (e.g. "147") — for Game.homeTeamId / awayTeamId
    const stadiumById      = new Map<string, Stadium>(stadiums.map((s) => [s.id, s]));
    const stadiumByTeamId  = new Map<string, Stadium>(stadiums.map((s) => [s.teamId, s]));

    const result: TimelineDayViewModel[] = trip.itinerary.map((day) =>
      mapTripDayToViewModel(day, stadiumById, stadiumByTeamId),
    );

    // Task 4.1: final guard before committing results to reactive state
    if (!isMounted || requestId !== requestCounter) return;

    timelineDays.value = result;
    isLoading.value    = false;
  }

  watch(
    selectedTrip,
    () => {
      requestCounter++;
      void buildTimelineDays(requestCounter);
    },
    { immediate: true },
  );

  return { timelineDays, isLoading, error };
}
