// src/utils/tooltipContentUtils.ts
import type { StadiumMarkerData } from '@/types';
import { escapeHtml } from './htmlUtils';

/**
 * Returns the tooltip string for Leaflet's L.Tooltip (F-07.5).
 *
 * ⚠️  Leaflet renders tooltip content via innerHTML — it does NOT auto-escape.
 *    All dynamic data must be escaped to prevent HTML injection.
 *    escapeHtml() is applied to every interpolated field below.
 */
export function buildTooltipText(data: StadiumMarkerData): string {
  const nickname = escapeHtml(data.teamNickname);
  const stadium  = escapeHtml(data.stadiumName);
  const location = `${escapeHtml(data.city)}, ${escapeHtml(data.state)}`;
  return `${nickname} — ${stadium} · ${location}`;
}
