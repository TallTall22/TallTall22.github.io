// src/services/routingService.ts
import { loadStadiums } from '@/services/stadiumService';
import {
  buildStadiumByTeamIdMap,
  buildStadiumByIdMap,
  buildItinerary,
  assembleTripFromItinerary,
} from '@/utils/routingAlgorithm';
import type { Game, RoutingOptions, RoutingResult } from '@/types/models';

/**
 * Orchestrates the full routing pipeline:
 *   load stadiums → validate inputs → run greedy algorithm → return RoutingResult.
 *
 * All error paths return a typed RoutingAlgorithmErrorCode — never throws.
 */
export async function computeTrip(
  filteredGames: Game[],
  options:       RoutingOptions,
): Promise<RoutingResult> {
  // Guard: no games provided
  if (filteredGames.length === 0) {
    return { trip: null, error: 'NO_GAMES', totalGamesAttended: 0, totalTravelDays: 0 };
  }

  // Load stadiums (uses module-level cache from stadiumService)
  const stadiumResult = await loadStadiums();
  if (stadiumResult.error !== null) {
    return { trip: null, error: 'STADIUM_LOAD_FAILED', totalGamesAttended: 0, totalTravelDays: 0 };
  }

  const { stadiums } = stadiumResult;
  const byId     = buildStadiumByIdMap(stadiums);
  const byTeamId = buildStadiumByTeamIdMap(stadiums);

  // Guard: home stadium must resolve via Stadium.id (e.g. "NYY")
  const homeStadium = byId.get(options.homeStadiumId);
  if (homeStadium === undefined) {
    return { trip: null, error: 'NO_HOME_STADIUM', totalGamesAttended: 0, totalTravelDays: 0 };
  }

  const itinerary = buildItinerary(
    filteredGames,
    homeStadium,
    byTeamId,
    options.startDate,
    options.endDate,
  );

  // Guard: algorithm must produce at least one day (shouldn't happen with valid inputs)
  if (itinerary.length === 0) {
    return { trip: null, error: 'EMPTY_ITINERARY', totalGamesAttended: 0, totalTravelDays: 0 };
  }

  const totalGamesAttended = itinerary.filter((d) => d.type === 'game_day').length;
  const totalTravelDays    = itinerary.filter((d) => d.type === 'travel_day').length;

  // Guard: at least one game must be attended for a valid trip
  if (totalGamesAttended === 0) {
    return { trip: null, error: 'NO_GAMES', totalGamesAttended: 0, totalTravelDays };
  }

  const trip = assembleTripFromItinerary(itinerary, options);
  return { trip, error: null, totalGamesAttended, totalTravelDays };
}
