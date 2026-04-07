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

export interface Game {
  gameId:         string;
  date:           ISODateString;
  dayOfWeek:      string;
  homeTeamId:     string;
  awayTeamId:     string;
  startTimeLocal: string;
  startTimeUtc:   string;
  venue:          string;
  series?: {
    seriesId:    string;
    gameNumber:  number;
    maxGames:    number;
  };
}

export interface TripDay {
  dayNumber:             number;
  date:                  ISODateString;
  type:                  'game_day' | 'travel_day';
  stadiumId?:            string;
  game?:                 Game;
  distanceFromPrevious?: number;
  estimatedTravelTime?:  number;
}

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

export interface UiState {
  isLoading:      boolean;
  error?:         string;
  selectedTrip:   Trip | null;
  mapCenter: {
    lat: number;
    lng: number;
  };
  mapZoom:         number;
  highlightedDay?: number;
  isSidebarOpen:   boolean;
  viewMode:        'map' | 'timeline' | 'split';
}
