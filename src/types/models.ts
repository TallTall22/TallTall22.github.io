// src/types/models.ts

/** ISO 8601 date string: "YYYY-MM-DD" */
export type ISODateString = string;

export interface DateRange {
  startDate: ISODateString | null;
  endDate:   ISODateString | null;
}

export type ValidationErrorCode =
  | 'END_BEFORE_START'
  | 'EXCEEDS_MAX_DAYS'
  | 'START_IN_PAST'
  | 'MISSING_START'
  | 'MISSING_END';

export interface ValidationResult {
  valid:    boolean;
  error:    ValidationErrorCode | null;
  dayCount: number;
  message:  string | null;
}

export const MAX_TRIP_DAYS = 180 as const;

export interface GameSeries {
  seriesId:   string;
  gameNumber: number;
  maxGames:   number;
}

export interface Game {
  gameId:         string;
  date:           ISODateString;
  dayOfWeek:      string;
  homeTeamId:     string;
  awayTeamId:     string;
  startTimeLocal: string;
  startTimeUtc:   string;
  venue:          string;
  series?: GameSeries;
}

interface TripDayBase {
  dayNumber:             number;
  date:                  ISODateString;
  distanceFromPrevious?: number;
  estimatedTravelTime?:  number;
}

export interface GameDay extends TripDayBase {
  type:      'game_day';
  stadiumId: string;
  game:      Game;
}

export interface TravelDay extends TripDayBase {
  type:       'travel_day';
  stadiumId?: string;
  game?:      never;
}

export type TripDay = GameDay | TravelDay;

export interface Stadium {
  id:              string;
  teamId:          string;
  teamName:        string;
  teamNickname:    string;
  stadiumName:     string;
  city:            string;
  state:           string;
  coordinates: {
    lat: number;
    lng: number;
  };
  timeZone:         string;
  league:           'AL' | 'NL';
  division:         'ALE' | 'ALW' | 'ALC' | 'NLE' | 'NLW' | 'NLC';
  logoUrl:          string;
  stadiumPhotoUrl:  string;
  officialsWebsite?: string;
}

export interface Trip {
  tripId:        string;
  createdAt:     ISODateString;
  startDate:     ISODateString;
  endDate:       ISODateString;
  homeStadiumId: string;
  itinerary:     TripDay[];
  totalDistance: number;
  qualityScore:  number;
}

export type StadiumLoadErrorCode =
  | 'FETCH_FAILED'
  | 'PARSE_ERROR'
  | 'EMPTY_DATA';

export interface StadiumLoadResult {
  stadiums: Stadium[];
  error:    StadiumLoadErrorCode | null;
}

// ── Game 服務層型別 ──────────────────────────────────────────────

export type GameLoadErrorCode =
  | 'FETCH_FAILED'   // dynamic import 失敗（網路/bundle 錯誤）
  | 'PARSE_ERROR'    // JSON 格式不符合 Game[] 結構
  | 'EMPTY_DATA';    // 陣列為空

export interface GameLoadResult {
  games: Game[];
  error: GameLoadErrorCode | null;
}

// ── 篩選選項（由呼叫端傳入，純函式用） ──────────────────────────

export interface GameFilterOptions {
  startDate: ISODateString;   // inclusive
  endDate:   ISODateString;   // inclusive
}

// ── 篩選結果統計（除 games 本體外附帶 debug 資訊） ────────────────

export interface FilteredGamesResult {
  games:             Game[];   // 最終乾淨陣列：已篩選 + 去重 + 排序
  rawCount:          number;   // 載入後、篩選前的總筆數
  filteredCount:     number;   // 日期篩選後（去重前）的筆數
  duplicatesRemoved: number;   // 被 deduplicateByGameId 移除的筆數
}

// ── F-05: Routing Algorithm Types ────────────────────────────────────────────

export interface RoutingOptions {
  startDate:     ISODateString;
  endDate:       ISODateString;
  /** Stadium.id (e.g. "NYY") — matches tripStore.homeStadiumId */
  homeStadiumId: string;
}

/**
 * A game candidate scored during the greedy pass.
 * score > 0 means reachable; higher = closer = better.
 */
export interface ScoredCandidate {
  game:       Game;
  stadium:    Stadium;
  distanceKm: number;
  score:      number;
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

// ── F-10: Export & Share Error Codes ─────────────────────────────────────────

export type ExportErrorCode =
  | 'NO_TRIP'         // selectedTrip is null — nothing to export/share
  | 'CLIPBOARD_FAIL'  // navigator.clipboard.writeText and execCommand fallback both failed
  | 'ENCODE_FAIL';    // URL-safe base64 encoding threw unexpectedly
