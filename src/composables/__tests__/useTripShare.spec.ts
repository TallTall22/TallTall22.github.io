// src/composables/__tests__/useTripShare.spec.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useTripShare } from '../useTripShare';
import { useTripStore } from '@/stores/tripStore';
import type { Trip } from '@/types';

// ── Fixture ──────────────────────────────────────────────────────────────────
const MOCK_TRIP: Trip = {
  tripId:        'share-test-001',
  createdAt:     '2026-04-12',
  startDate:     '2026-04-12',
  endDate:       '2026-04-20',
  homeStadiumId: 'NYY',
  itinerary:     [],
  totalDistance: 300,
  qualityScore:  0.8,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build a URL-safe base64 payload for testing restoreFromUrl */
function buildEncodedParam(s: string, e: string, h: string): string {
  return btoa(JSON.stringify({ s, e, h }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function setWindowSearch(search: string, pathname = '/'): void {
  Object.defineProperty(window, 'location', {
    value: {
      search,
      pathname,
      href: `http://localhost${pathname}${search}`,
    },
    writable:     true,
    configurable: true,
  });
}

describe('useTripShare', () => {
  let replaceStateSpy: ReturnType<typeof vi.spyOn>;
  let writeTextSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    setActivePinia(createPinia());

    replaceStateSpy = vi.spyOn(window.history, 'replaceState').mockImplementation(() => {});

    writeTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value:        { writeText: writeTextSpy },
      writable:     true,
      configurable: true,
    });

    setWindowSearch('');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Initial state ────────────────────────────────────────────────────────

  it('shareError starts as null', () => {
    const { shareError } = useTripShare();
    expect(shareError.value).toBeNull();
  });

  it('isSharing starts as false', () => {
    const { isSharing } = useTripShare();
    expect(isSharing.value).toBe(false);
  });

  // ── shareTrip: NO_TRIP guards ────────────────────────────────────────────

  it('shareTrip sets NO_TRIP when selectedTrip is null', async () => {
    const { shareTrip, shareError } = useTripShare();
    await shareTrip();

    expect(shareError.value).toBe('NO_TRIP');
    expect(replaceStateSpy).not.toHaveBeenCalled();
  });

  it('shareTrip sets NO_TRIP when startDate is null', async () => {
    const tripStore = useTripStore();
    tripStore.setEndDate('2026-04-20');
    tripStore.setHomeStadium('NYY');
    tripStore.setSelectedTrip(MOCK_TRIP);

    const { shareTrip, shareError } = useTripShare();
    await shareTrip();

    expect(shareError.value).toBe('NO_TRIP');
  });

  it('shareTrip sets NO_TRIP when endDate is null', async () => {
    const tripStore = useTripStore();
    tripStore.setStartDate('2026-04-12');
    tripStore.setHomeStadium('NYY');
    tripStore.setSelectedTrip(MOCK_TRIP);

    const { shareTrip, shareError } = useTripShare();
    await shareTrip();

    expect(shareError.value).toBe('NO_TRIP');
  });

  it('shareTrip sets NO_TRIP when homeStadiumId is null', async () => {
    const tripStore = useTripStore();
    tripStore.setStartDate('2026-04-12');
    tripStore.setEndDate('2026-04-20');
    tripStore.setSelectedTrip(MOCK_TRIP);

    const { shareTrip, shareError } = useTripShare();
    await shareTrip();

    expect(shareError.value).toBe('NO_TRIP');
  });

  // ── shareTrip: happy path ────────────────────────────────────────────────

  it('shareTrip writes ?trip=<encoded> to browser URL', async () => {
    const tripStore = useTripStore();
    tripStore.setStartDate('2026-04-12');
    tripStore.setEndDate('2026-04-20');
    tripStore.setHomeStadium('NYY');
    tripStore.setSelectedTrip(MOCK_TRIP);

    const { shareTrip } = useTripShare();
    await shareTrip();

    expect(replaceStateSpy).toHaveBeenCalledOnce();
    const writtenUrl = replaceStateSpy.mock.calls[0][2] as string;
    expect(writtenUrl).toMatch(/^\?trip=[A-Za-z0-9_-]+$/);
  });

  it('shareTrip copies the URL to clipboard', async () => {
    const tripStore = useTripStore();
    tripStore.setStartDate('2026-04-12');
    tripStore.setEndDate('2026-04-20');
    tripStore.setHomeStadium('NYY');
    tripStore.setSelectedTrip(MOCK_TRIP);

    const { shareTrip } = useTripShare();
    await shareTrip();

    expect(writeTextSpy).toHaveBeenCalledOnce();
  });

  it('shareTrip clears a previous NO_TRIP error on successful retry', async () => {
    const { shareTrip, shareError } = useTripShare();

    await shareTrip(); // no trip → error
    expect(shareError.value).toBe('NO_TRIP');

    const tripStore = useTripStore();
    tripStore.setStartDate('2026-04-12');
    tripStore.setEndDate('2026-04-20');
    tripStore.setHomeStadium('NYY');
    tripStore.setSelectedTrip(MOCK_TRIP);

    await shareTrip();
    expect(shareError.value).toBeNull();
  });

  it('isSharing is false after shareTrip resolves', async () => {
    const tripStore = useTripStore();
    tripStore.setStartDate('2026-04-12');
    tripStore.setEndDate('2026-04-20');
    tripStore.setHomeStadium('NYY');
    tripStore.setSelectedTrip(MOCK_TRIP);

    const { shareTrip, isSharing } = useTripShare();
    await shareTrip();

    expect(isSharing.value).toBe(false);
  });

  it('shareTrip sets CLIPBOARD_FAIL when both clipboard strategies fail', async () => {
    // Make navigator.clipboard.writeText reject
    writeTextSpy.mockRejectedValue(new Error('no permission'));
    // Stub document.execCommand to throw (jsdom may not have it)
    Object.defineProperty(document, 'execCommand', {
      value:        vi.fn(() => { throw new Error('execCommand failed'); }),
      writable:     true,
      configurable: true,
    });

    const tripStore = useTripStore();
    tripStore.setStartDate('2026-04-12');
    tripStore.setEndDate('2026-04-20');
    tripStore.setHomeStadium('NYY');
    tripStore.setSelectedTrip(MOCK_TRIP);

    const { shareTrip, shareError } = useTripShare();
    await shareTrip();

    expect(shareError.value).toBe('CLIPBOARD_FAIL');
  });

  // ── restoreFromUrl: no param ─────────────────────────────────────────────

  it('restoreFromUrl is a no-op when no ?trip param is present', () => {
    setWindowSearch('');

    const tripStore = useTripStore();
    const setStartSpy = vi.spyOn(tripStore, 'setStartDate');

    const { restoreFromUrl } = useTripShare();
    restoreFromUrl();

    expect(setStartSpy).not.toHaveBeenCalled();
    expect(replaceStateSpy).not.toHaveBeenCalled();
  });

  // ── restoreFromUrl: valid param ──────────────────────────────────────────

  it('restoreFromUrl sets startDate from encoded payload', () => {
    const encoded = buildEncodedParam('2026-06-01', '2026-06-15', 'BOS');
    setWindowSearch(`?trip=${encoded}`);

    const tripStore = useTripStore();
    const { restoreFromUrl } = useTripShare();
    restoreFromUrl();

    expect(tripStore.startDate).toBe('2026-06-01');
  });

  it('restoreFromUrl sets endDate from encoded payload', () => {
    const encoded = buildEncodedParam('2026-06-01', '2026-06-15', 'BOS');
    setWindowSearch(`?trip=${encoded}`);

    const tripStore = useTripStore();
    const { restoreFromUrl } = useTripShare();
    restoreFromUrl();

    expect(tripStore.endDate).toBe('2026-06-15');
  });

  it('restoreFromUrl sets homeStadiumId from encoded payload', () => {
    const encoded = buildEncodedParam('2026-06-01', '2026-06-15', 'BOS');
    setWindowSearch(`?trip=${encoded}`);

    const tripStore = useTripStore();
    const { restoreFromUrl } = useTripShare();
    restoreFromUrl();

    expect(tripStore.homeStadiumId).toBe('BOS');
  });

  it('restoreFromUrl calls requestTripGeneration to trigger routing', () => {
    const encoded = buildEncodedParam('2026-06-01', '2026-06-15', 'BOS');
    setWindowSearch(`?trip=${encoded}`);

    const tripStore = useTripStore();
    const requestSpy = vi.spyOn(tripStore, 'requestTripGeneration');

    const { restoreFromUrl } = useTripShare();
    restoreFromUrl();

    expect(requestSpy).toHaveBeenCalledOnce();
  });

  // ── restoreFromUrl: invalid param ────────────────────────────────────────

  it('restoreFromUrl silently removes URL param when base64 is invalid', () => {
    setWindowSearch('?trip=!!!NOT_VALID_BASE64!!!');

    const tripStore = useTripStore();
    const setStartSpy = vi.spyOn(tripStore, 'setStartDate');

    const { restoreFromUrl } = useTripShare();
    restoreFromUrl();

    expect(replaceStateSpy).toHaveBeenCalledWith({}, '', '/');
    expect(setStartSpy).not.toHaveBeenCalled();
  });

  it('restoreFromUrl removes URL param when JSON is missing required fields', () => {
    const partial = btoa(JSON.stringify({ s: '2026-04-12', e: '2026-04-20' }))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    setWindowSearch(`?trip=${partial}`);

    const { restoreFromUrl } = useTripShare();
    restoreFromUrl();

    expect(replaceStateSpy).toHaveBeenCalledWith({}, '', '/');
  });

  it('restoreFromUrl removes URL param when field value is empty string', () => {
    const badEmpty = buildEncodedParam('', '2026-04-20', 'NYY');
    setWindowSearch(`?trip=${badEmpty}`);

    const { restoreFromUrl } = useTripShare();
    restoreFromUrl();

    expect(replaceStateSpy).toHaveBeenCalledWith({}, '', '/');
  });

  it('restoreFromUrl removes URL param when payload is not an object', () => {
    const badType = btoa(JSON.stringify(42))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    setWindowSearch(`?trip=${badType}`);

    const { restoreFromUrl } = useTripShare();
    restoreFromUrl();

    expect(replaceStateSpy).toHaveBeenCalledWith({}, '', '/');
  });

  // ── Encode / decode roundtrip ────────────────────────────────────────────

  it('encode→decode roundtrip is lossless across shareTrip + restoreFromUrl', async () => {
    const tripStore = useTripStore();
    tripStore.setStartDate('2026-07-04');
    tripStore.setEndDate('2026-07-18');
    tripStore.setHomeStadium('LAD');
    tripStore.setSelectedTrip(MOCK_TRIP);

    const { shareTrip } = useTripShare();
    await shareTrip();

    // Extract the encoded value from the URL written to history
    const writtenUrl = replaceStateSpy.mock.calls[0][2] as string;
    const encoded = new URLSearchParams(writtenUrl.slice(1)).get('trip')!;
    expect(encoded).toBeTruthy();

    // Simulate fresh app load with the shared URL
    setActivePinia(createPinia());
    const freshStore = useTripStore();
    setWindowSearch(`?trip=${encoded}`);

    const { restoreFromUrl } = useTripShare();
    restoreFromUrl();

    expect(freshStore.startDate).toBe('2026-07-04');
    expect(freshStore.endDate).toBe('2026-07-18');
    expect(freshStore.homeStadiumId).toBe('LAD');
  });
});
