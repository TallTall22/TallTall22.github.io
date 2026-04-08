// src/services/__tests__/stadiumService.test.ts
import { describe, it, expect } from 'vitest';
import { loadStadiums } from '../stadiumService';

describe('stadiumService.loadStadiums', () => {
  it('returns 30 stadiums on success', async () => {
    const result = await loadStadiums();
    expect(result.error).toBeNull();
    expect(result.stadiums).toHaveLength(30);
  });

  it('each stadium has required fields', async () => {
    const { stadiums } = await loadStadiums();
    for (const s of stadiums) {
      expect(s.id).toBeTruthy();
      expect(s.teamId).toBeTruthy();
      expect(['AL', 'NL']).toContain(s.league);
      expect(['ALE', 'ALW', 'ALC', 'NLE', 'NLW', 'NLC']).toContain(s.division);
      expect(s.coordinates.lat).toBeTypeOf('number');
      expect(s.coordinates.lng).toBeTypeOf('number');
      expect(s.logoUrl).toMatch(/mlbstatic\.com/);
    }
  });
});
