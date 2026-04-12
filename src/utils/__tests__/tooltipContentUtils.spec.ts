// src/utils/__tests__/tooltipContentUtils.spec.ts
import { describe, it, expect } from 'vitest';
import { buildTooltipText } from '@/utils/tooltipContentUtils';
import type { StadiumMarkerData } from '@/types';

// ── Fixtures ───────────────────────────────────────────────────────────────────

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

/** Marker with XSS-triggering special characters in every field */
const XSS_MARKER: StadiumMarkerData = {
  ...BASE_MARKER,
  teamNickname:    '<script>alert(1)</script>',
  stadiumName:     '"Evil" & <Arena>',
  city:            "City's<Town>",
  state:           'S&T',
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('buildTooltipText()', () => {
  describe('content — all data fields are present in the output', () => {
    it('output contains teamNickname', () => {
      const text = buildTooltipText(BASE_MARKER);
      expect(text).toContain('Yankees');
    });

    it('output contains stadiumName', () => {
      const text = buildTooltipText(BASE_MARKER);
      expect(text).toContain('Yankee Stadium');
    });

    it('output contains city', () => {
      const text = buildTooltipText(BASE_MARKER);
      expect(text).toContain('New York');
    });

    it('output contains state', () => {
      const text = buildTooltipText(BASE_MARKER);
      expect(text).toContain('NY');
    });
  });

  describe('format — separators are correct', () => {
    it('em dash (—) separates teamNickname from stadiumName', () => {
      const text = buildTooltipText(BASE_MARKER);
      expect(text).toContain('—');
      // Nickname must appear before the em dash
      const dashIndex    = text.indexOf('—');
      const nicknameEnd  = text.indexOf('Yankees') + 'Yankees'.length;
      expect(nicknameEnd).toBeLessThanOrEqual(dashIndex);
    });

    it('middle dot (·) separates stadiumName from location', () => {
      const text = buildTooltipText(BASE_MARKER);
      expect(text).toContain('·');
    });

    it('matches the exact pattern "Nickname — Stadium · City, State"', () => {
      const text = buildTooltipText(BASE_MARKER);
      expect(text).toBe('Yankees — Yankee Stadium · New York, NY');
    });
  });

  describe('XSS escaping — special characters in each field are HTML-escaped', () => {
    it('< in teamNickname is escaped to &lt;', () => {
      const text = buildTooltipText(XSS_MARKER);
      expect(text).not.toContain('<script>');
      expect(text).toContain('&lt;script&gt;');
    });

    it('> in teamNickname is escaped to &gt;', () => {
      const text = buildTooltipText(XSS_MARKER);
      expect(text).not.toContain('</script>');
      expect(text).toContain('&lt;/script&gt;');
    });

    it('" in stadiumName is escaped to &quot;', () => {
      const text = buildTooltipText(XSS_MARKER);
      expect(text).not.toContain('"Evil"');
      expect(text).toContain('&quot;Evil&quot;');
    });

    it('& in stadiumName is escaped to &amp;', () => {
      const text = buildTooltipText(XSS_MARKER);
      expect(text).toContain('&amp;');
    });

    it("' in city is escaped to &#39;", () => {
      const text = buildTooltipText(XSS_MARKER);
      expect(text).not.toContain("City's");
      expect(text).toContain('City&#39;s');
    });

    it('& in state is escaped to &amp;', () => {
      const text = buildTooltipText(XSS_MARKER);
      // Both stadiumName and state contain &; verify at least one &amp; after the ·
      const dotIndex = text.indexOf('·');
      const afterDot = text.slice(dotIndex);
      expect(afterDot).toContain('&amp;');
    });

    it('no raw < or > characters remain in the output', () => {
      const text = buildTooltipText(XSS_MARKER);
      expect(text).not.toMatch(/<[^&]/);
      expect(text).not.toMatch(/[^&]>/);
    });
  });
});
