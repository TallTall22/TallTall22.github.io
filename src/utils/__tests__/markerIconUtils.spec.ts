// src/utils/__tests__/markerIconUtils.spec.ts
import { describe, it, expect, vi } from 'vitest';
import type { MarkerStatus } from '@/types';

// ── Leaflet Mock ───────────────────────────────────────────────────────────────
// L.divIcon is a DOM-dependent factory. We stub it to return its options object
// so tests can inspect html, iconSize, iconAnchor, popupAnchor, className, etc.
vi.mock('leaflet', () => ({
  default: {
    divIcon: (options: Record<string, unknown>) => ({ ...options }),
  },
}));

// Import AFTER mock is registered
import { createMarkerDivIcon } from '@/utils/markerIconUtils';

// ── Fixtures ───────────────────────────────────────────────────────────────────
const ALL_STATUSES: MarkerStatus[] = ['scheduled', 'unscheduled', 'home'];

// Helper: cast the opaque L.DivIcon return to a plain object for assertions
type DivIconStub = {
  html:          string;
  className:     string;
  iconSize:      [number, number];
  iconAnchor:    [number, number];
  popupAnchor:   [number, number];
  tooltipAnchor: [number, number];
};

function iconOf(status: MarkerStatus): DivIconStub {
  return createMarkerDivIcon(status) as unknown as DivIconStub;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('createMarkerDivIcon()', () => {
  describe("status = 'scheduled'", () => {
    it("html contains MLB Blue color #002D72", () => {
      expect(iconOf('scheduled').html).toContain('#002D72');
    });

    it("iconSize is [18, 18]", () => {
      expect(iconOf('scheduled').iconSize).toEqual([18, 18]);
    });

    it("className is empty string (no Leaflet default white square)", () => {
      expect(iconOf('scheduled').className).toBe('');
    });
  });

  describe("status = 'home'", () => {
    it("html contains Gold color #FFD700", () => {
      expect(iconOf('home').html).toContain('#FFD700');
    });

    it("iconSize is [22, 22]", () => {
      expect(iconOf('home').iconSize).toEqual([22, 22]);
    });

    it("className is empty string", () => {
      expect(iconOf('home').className).toBe('');
    });
  });

  describe("status = 'unscheduled'", () => {
    it("html contains Gray color #757575", () => {
      expect(iconOf('unscheduled').html).toContain('#757575');
    });

    it("iconSize is [14, 14]", () => {
      expect(iconOf('unscheduled').iconSize).toEqual([14, 14]);
    });

    it("className is empty string", () => {
      expect(iconOf('unscheduled').className).toBe('');
    });
  });

  describe('popupAnchor — points upward for all statuses', () => {
    it.each(ALL_STATUSES)("status='%s' → popupAnchor[1] is negative", (status) => {
      const icon = iconOf(status);
      expect(icon.popupAnchor[1]).toBeLessThan(0);
    });
  });

  describe('iconAnchor — centred on the marker circle for all statuses', () => {
    it.each(ALL_STATUSES)("status='%s' → iconAnchor = [size/2, size/2]", (status) => {
      const icon = iconOf(status);
      const [w, h] = icon.iconSize;
      const [ax, ay] = icon.iconAnchor;
      expect(ax).toBe(w / 2);
      expect(ay).toBe(h / 2);
    });
  });

  describe('html contains correct BEM modifier class', () => {
    it.each(ALL_STATUSES)("status='%s' → html contains 'mlb-marker--%s'", (status) => {
      expect(iconOf(status).html).toContain(`mlb-marker--${status}`);
    });
  });
});
