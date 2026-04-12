// src/utils/__tests__/popupContentUtils.spec.ts
import { describe, it, expect } from 'vitest';
import { buildPopupHtml } from '@/utils/popupContentUtils';
import type { StadiumMarkerData } from '@/types';

// ── Mock fixture ───────────────────────────────────────────────────────────────
const BASE_MARKER: StadiumMarkerData = {
  stadiumId:       'NYY',
  teamName:        'New York Yankees',
  teamNickname:    'Yankees',
  stadiumName:     'Yankee Stadium',
  city:            'New York',
  state:           'NY',
  lat:             40.8296,
  lng:             -73.9262,
  logoUrl:         '/logo/147.svg',
  stadiumPhotoUrl: '/img/NYY.jpg',
  status:          'home',
};

// Fixture with XSS-triggering special characters
const SPECIAL_CHARS_MARKER: StadiumMarkerData = {
  ...BASE_MARKER,
  teamName:    '<Script & "Injection">',
  stadiumName: "O'Malley Arena",
  city:        'City&Town',
  state:       'NY',
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('buildPopupHtml()', () => {
  describe('content — team and stadium names are rendered', () => {
    it('output contains teamName', () => {
      const html = buildPopupHtml(BASE_MARKER);
      expect(html).toContain('New York Yankees');
    });

    it('output contains stadiumName', () => {
      const html = buildPopupHtml(BASE_MARKER);
      expect(html).toContain('Yankee Stadium');
    });

    it('output contains city', () => {
      const html = buildPopupHtml(BASE_MARKER);
      expect(html).toContain('New York');
    });

    it('output contains state', () => {
      const html = buildPopupHtml(BASE_MARKER);
      expect(html).toContain('NY');
    });
  });

  describe('images — src attributes and loading behaviour', () => {
    it('stadiumPhotoUrl appears in an img src attribute', () => {
      const html = buildPopupHtml(BASE_MARKER);
      expect(html).toContain(`src="${BASE_MARKER.stadiumPhotoUrl}"`);
    });

    it('logoUrl appears in an img src attribute', () => {
      const html = buildPopupHtml(BASE_MARKER);
      expect(html).toContain(`src="${BASE_MARKER.logoUrl}"`);
    });

    it('stadium photo img has loading="lazy"', () => {
      const html = buildPopupHtml(BASE_MARKER);
      // The photo img is the second img; verify lazy loading is present.
      expect(html).toContain('loading="lazy"');
    });

    it('does not use inline onerror handlers (CSP-safe; error handling via JS listener in MapMarkerLayer)', () => {
      const html = buildPopupHtml(BASE_MARKER);
      expect(html).not.toContain('onerror');
    });
  });

  describe('XSS escaping — special characters are sanitised', () => {
    it('< is escaped to &lt;', () => {
      const html = buildPopupHtml(SPECIAL_CHARS_MARKER);
      expect(html).not.toContain('<Script');
      expect(html).toContain('&lt;Script');
    });

    it('> is escaped to &gt;', () => {
      const html = buildPopupHtml(SPECIAL_CHARS_MARKER);
      expect(html).toContain('&gt;');
    });

    it('& is escaped to &amp;', () => {
      const html = buildPopupHtml(SPECIAL_CHARS_MARKER);
      expect(html).toContain('&amp;');
    });

    it('" is escaped to &quot;', () => {
      const html = buildPopupHtml(SPECIAL_CHARS_MARKER);
      expect(html).toContain('&quot;');
    });

    it("' in stadiumName is escaped to &#39;", () => {
      const html = buildPopupHtml(SPECIAL_CHARS_MARKER);
      expect(html).not.toContain("O'Malley");
      expect(html).toContain('O&#39;Malley');
    });
  });

  describe('structure — CSS class hierarchy', () => {
    it('root element has class stadium-popup', () => {
      const html = buildPopupHtml(BASE_MARKER);
      expect(html).toContain('class="stadium-popup"');
    });

    it('contains stadium-popup__header', () => {
      const html = buildPopupHtml(BASE_MARKER);
      expect(html).toContain('stadium-popup__header');
    });

    it('contains stadium-popup__photo', () => {
      const html = buildPopupHtml(BASE_MARKER);
      expect(html).toContain('stadium-popup__photo');
    });

    it('contains stadium-popup__logo', () => {
      const html = buildPopupHtml(BASE_MARKER);
      expect(html).toContain('stadium-popup__logo');
    });
  });
});
