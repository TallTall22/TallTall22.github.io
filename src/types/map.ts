// src/types/map.ts

/** Discriminated union for polyline segment styling */
export type SegmentType = 'game_day' | 'travel_day';

/** Discriminated literal for marker visual state (F-07.2) */
export type MarkerStatus = 'scheduled' | 'unscheduled' | 'home';

/**
 * Enriched stadium data for Leaflet marker rendering (F-07).
 * Derived by useStadiumMarkers from Stadium + Trip itinerary.
 * All fields are readonly to prevent accidental mutation.
 */
export interface StadiumMarkerData {
  readonly stadiumId:       string;
  readonly teamName:        string;
  readonly teamNickname:    string;
  readonly stadiumName:     string;
  readonly city:            string;
  readonly state:           string;
  readonly lat:             number;
  readonly lng:             number;
  readonly logoUrl:         string;
  readonly stadiumPhotoUrl: string;
  readonly status:          MarkerStatus;
}

/** Geographic coordinate (WGS-84) */
export interface MapCoordinate {
  readonly lat: number;
  readonly lng: number;
}

/**
 * A single directed segment between two consecutive itinerary stops.
 * Used by MapPolylineLayer to render a styled Leaflet Polyline.
 */
export interface MapPolylineSegment {
  /** Unique id: `${fromStadiumId}|${toStadiumId}|day${dayIndex}` */
  readonly id:          string;
  readonly from:        MapCoordinate;
  readonly to:          MapCoordinate;
  readonly segmentType: SegmentType;
  /** Index of the "from" day in the itinerary (0-based) */
  readonly dayIndex:    number;
}

/**
 * Axis-aligned bounding box enclosing all route stops.
 * Passed to Leaflet map.fitBounds().
 */
export interface MapBounds {
  readonly north: number;
  readonly south: number;
  readonly east:  number;
  readonly west:  number;
}
