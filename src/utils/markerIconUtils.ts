// src/utils/markerIconUtils.ts
import L from 'leaflet';
import type { MarkerStatus } from '@/types';

const STATUS_COLORS: Record<MarkerStatus, string> = {
  scheduled:   '#002D72', // MLB Blue
  unscheduled: '#757575', // Gray
  home:        '#FFD700', // Gold
} as const;

const STATUS_SIZES: Record<MarkerStatus, number> = {
  scheduled:   18,
  unscheduled: 14,
  home:        22,
} as const;

const STATUS_BORDER: Record<MarkerStatus, string> = {
  scheduled:   '2px solid #FFFFFF',
  unscheduled: '1px solid #BDBDBD',
  home:        '3px solid #B8860B',
} as const;

/**
 * Creates a Leaflet DivIcon with a custom CSS circle matching the MLB design system.
 * Uses inline CSS — no SVG dependency, no Leaflet default white square background.
 * F-07.1 / F-07.2: all-stadium markers with status-based color coding.
 */
export function createMarkerDivIcon(status: MarkerStatus): L.DivIcon {
  const size   = STATUS_SIZES[status];
  const color  = STATUS_COLORS[status];
  const border = STATUS_BORDER[status];

  const html = `<div class="mlb-marker mlb-marker--${status}" style="width:${size}px;height:${size}px;background-color:${color};border:${border};border-radius:9999px;box-shadow:0 1px 3px rgba(0,0,0,0.35);transition:all 0.2s ease;cursor:pointer;"></div>`;

  return L.divIcon({
    html,
    className:     '',                    // clear Leaflet default white square
    iconSize:      [size, size],
    iconAnchor:    [size / 2, size / 2],
    popupAnchor:   [0, -(size / 2 + 4)],
    tooltipAnchor: [0, -(size / 2 + 2)],
  });
}
