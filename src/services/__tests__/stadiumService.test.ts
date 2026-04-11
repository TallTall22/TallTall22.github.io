// src/services/__tests__/stadiumService.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadStadiums, _clearStadiumCache, _setStadiumJsonLoader } from '../stadiumService';

describe('stadiumService.loadStadiums', () => {
  it('returns at least 30 stadiums on success', async () => {
    const result = await loadStadiums();
    expect(result.error).toBeNull();
    expect(result.stadiums.length).toBeGreaterThanOrEqual(30);
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

describe('stadiumService — error paths and caching', () => {
  beforeEach(() => {
    _clearStadiumCache();
  });

  afterEach(() => {
    _clearStadiumCache();
    _setStadiumJsonLoader(undefined); // restore real loader
  });

  it('returns PARSE_ERROR when JSON is not an array', async () => {
    _setStadiumJsonLoader(async () => ({ default: { not: 'an array' } }));
    const result = await loadStadiums();
    expect(result.error).toBe('PARSE_ERROR');
    expect(result.stadiums).toHaveLength(0);
  });

  it('returns EMPTY_DATA when JSON is an empty array', async () => {
    _setStadiumJsonLoader(async () => ({ default: [] }));
    const result = await loadStadiums();
    expect(result.error).toBe('EMPTY_DATA');
    expect(result.stadiums).toHaveLength(0);
  });

  it('returns PARSE_ERROR when stadium objects fail shape validation', async () => {
    _setStadiumJsonLoader(async () => ({
      default: [{ id: 'x', teamName: 'y' }], // missing stadiumName, coordinates
    }));
    const result = await loadStadiums();
    expect(result.error).toBe('PARSE_ERROR');
  });

  it('returns PARSE_ERROR when coordinates.lat is not a number', async () => {
    _setStadiumJsonLoader(async () => ({
      default: [{
        id: 'NYY', teamName: 'New York Yankees', stadiumName: 'Yankee Stadium',
        coordinates: { lat: 'not-a-number', lng: -73.9 },
      }],
    }));
    const result = await loadStadiums();
    expect(result.error).toBe('PARSE_ERROR');
  });

  it('returns FETCH_FAILED when import throws a non-SyntaxError', async () => {
    _setStadiumJsonLoader(async () => { throw new Error('network error'); });
    const result = await loadStadiums();
    expect(result.error).toBe('FETCH_FAILED');
  });

  it('returns PARSE_ERROR when import throws a SyntaxError', async () => {
    _setStadiumJsonLoader(async () => { throw new SyntaxError('bad json'); });
    const result = await loadStadiums();
    expect(result.error).toBe('PARSE_ERROR');
  });

  it('caches result: second call does not invoke loader again', async () => {
    let callCount = 0;
    _setStadiumJsonLoader(async () => {
      callCount++;
      return { default: [{
        id: 'NYY', teamId: '147', teamName: 'New York Yankees',
        teamNickname: 'Yankees', league: 'AL', division: 'ALE',
        stadiumName: 'Yankee Stadium', city: 'Bronx', state: 'NY',
        coordinates: { lat: 40.829, lng: -73.926 },
        logoUrl: 'https://www.mlbstatic.com/team-logos/147.svg',
      }] };
    });
    await loadStadiums();
    await loadStadiums();
    expect(callCount).toBe(1);
  });

  it('_clearStadiumCache allows fresh load', async () => {
    let callCount = 0;
    _setStadiumJsonLoader(async () => {
      callCount++;
      return { default: [{
        id: 'NYY', teamId: '147', teamName: 'New York Yankees',
        teamNickname: 'Yankees', league: 'AL', division: 'ALE',
        stadiumName: 'Yankee Stadium', city: 'Bronx', state: 'NY',
        coordinates: { lat: 40.829, lng: -73.926 },
        logoUrl: 'https://www.mlbstatic.com/team-logos/147.svg',
      }] };
    });
    await loadStadiums();
    _clearStadiumCache();
    await loadStadiums();
    expect(callCount).toBe(2);
  });
});
