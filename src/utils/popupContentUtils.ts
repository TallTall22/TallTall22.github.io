// src/utils/popupContentUtils.ts
import type { StadiumMarkerData } from '@/types';
import { escapeHtml } from './htmlUtils';

/**
 * Builds the inner HTML string for a Leaflet Popup (F-07.3 / F-07.4).
 * Displays: team logo, team name, stadium name, city/state, stadium photo.
 * Broken-image hiding is handled via JS event listeners in MapMarkerLayer.vue
 * (CSP-safe — no inline onerror handlers).
 * Output is CSS-styled via the `.stadium-popup` class hierarchy.
 */
export function buildPopupHtml(data: StadiumMarkerData): string {
  const locationLabel = `${escapeHtml(data.city)}, ${escapeHtml(data.state)}`;

  return (
    `<div class="stadium-popup">` +
      `<div class="stadium-popup__header">` +
        `<img class="stadium-popup__logo" src="${escapeHtml(data.logoUrl)}" alt="${escapeHtml(data.teamName)} logo" width="32" height="32" />` +
        `<div class="stadium-popup__names">` +
          `<p class="stadium-popup__team">${escapeHtml(data.teamName)}</p>` +
          `<p class="stadium-popup__stadium">${escapeHtml(data.stadiumName)}</p>` +
          `<p class="stadium-popup__location">${locationLabel}</p>` +
        `</div>` +
      `</div>` +
      `<img class="stadium-popup__photo" src="${escapeHtml(data.stadiumPhotoUrl)}" alt="${escapeHtml(data.stadiumName)} photo" width="240" height="135" loading="lazy" />` +
    `</div>`
  );
}
