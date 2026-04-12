// src/composables/__tests__/useExportTrip.spec.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useExportTrip } from '../useExportTrip';
import { useTripStore } from '@/stores/tripStore';
import type { Trip } from '@/types';

// ── Browser API mocks ────────────────────────────────────────────────────────
const MOCK_BLOB_URL = 'blob:http://localhost/mock-12345';

// jsdom does not implement URL.createObjectURL / revokeObjectURL — stub them
URL.createObjectURL = vi.fn().mockReturnValue(MOCK_BLOB_URL);
URL.revokeObjectURL = vi.fn();

const createObjectUrlSpy = URL.createObjectURL as ReturnType<typeof vi.fn>;
const revokeObjectUrlSpy = URL.revokeObjectURL as ReturnType<typeof vi.fn>;

const anchorClickSpy = vi
  .spyOn(HTMLAnchorElement.prototype, 'click')
  .mockImplementation(() => {});
const printSpy = vi
  .spyOn(window, 'print')
  .mockImplementation(() => {});

// ── Fixture ──────────────────────────────────────────────────────────────────
const MOCK_TRIP: Trip = {
  tripId:        'export-test-001',
  createdAt:     '2026-04-12',
  startDate:     '2026-04-12',
  endDate:       '2026-04-20',
  homeStadiumId: 'NYY',
  itinerary:     [],
  totalDistance: 500,
  qualityScore:  0.75,
};

describe('useExportTrip', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.useFakeTimers();
    createObjectUrlSpy.mockClear();
    revokeObjectUrlSpy.mockClear();
    anchorClickSpy.mockClear();
    printSpy.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── Initial state ────────────────────────────────────────────────────────

  it('isExporting starts as false', () => {
    const { isExporting } = useExportTrip();
    expect(isExporting.value).toBe(false);
  });

  it('exportError starts as null', () => {
    const { exportError } = useExportTrip();
    expect(exportError.value).toBeNull();
  });

  // ── exportJson: NO_TRIP guard ────────────────────────────────────────────

  it('exportJson sets exportError = NO_TRIP when selectedTrip is null', () => {
    const { exportJson, exportError } = useExportTrip();
    exportJson();

    expect(exportError.value).toBe('NO_TRIP');
    expect(createObjectUrlSpy).not.toHaveBeenCalled();
    expect(anchorClickSpy).not.toHaveBeenCalled();
  });

  it('exportJson does not create blob when selectedTrip is null', () => {
    const { exportJson } = useExportTrip();
    exportJson();

    expect(createObjectUrlSpy).not.toHaveBeenCalled();
  });

  // ── exportJson: happy path ───────────────────────────────────────────────

  it('exportJson creates a blob URL when trip exists', () => {
    const tripStore = useTripStore();
    tripStore.setSelectedTrip(MOCK_TRIP);

    const { exportJson, exportError } = useExportTrip();
    exportJson();

    expect(createObjectUrlSpy).toHaveBeenCalledOnce();
    expect(exportError.value).toBeNull();
  });

  it('exportJson triggers anchor click to start download', () => {
    const tripStore = useTripStore();
    tripStore.setSelectedTrip(MOCK_TRIP);

    const { exportJson } = useExportTrip();
    exportJson();

    expect(anchorClickSpy).toHaveBeenCalledOnce();
  });

  it('exportJson sets correct download filename containing tripId', () => {
    const tripStore = useTripStore();
    tripStore.setSelectedTrip(MOCK_TRIP);

    // Capture the original before spying to avoid circular call inside the mock
    const originalCreate = document.createElement.bind(document);
    const capturedAnchors: HTMLAnchorElement[] = [];

    const createSpy = vi.spyOn(document, 'createElement')
      .mockImplementation((tag: string): HTMLElement => {
        const el = originalCreate(tag);
        if (el instanceof HTMLAnchorElement) capturedAnchors.push(el);
        return el;
      });

    try {
      const { exportJson } = useExportTrip();
      exportJson();
      expect(capturedAnchors[0]?.download).toBe('mlb-trip-export-test-001.json');
    } finally {
      createSpy.mockRestore();
    }
  });

  it('exportJson revokes blob URL after 100 ms', () => {
    const tripStore = useTripStore();
    tripStore.setSelectedTrip(MOCK_TRIP);

    const { exportJson } = useExportTrip();
    exportJson();

    expect(revokeObjectUrlSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);

    expect(revokeObjectUrlSpy).toHaveBeenCalledWith(MOCK_BLOB_URL);
  });

  it('exportJson does NOT revoke URL before timeout fires', () => {
    const tripStore = useTripStore();
    tripStore.setSelectedTrip(MOCK_TRIP);

    const { exportJson } = useExportTrip();
    exportJson();

    vi.advanceTimersByTime(99);
    expect(revokeObjectUrlSpy).not.toHaveBeenCalled();
  });

  it('exportJson clears a previous NO_TRIP error on successful retry', () => {
    const { exportJson, exportError } = useExportTrip();

    exportJson(); // no trip → error
    expect(exportError.value).toBe('NO_TRIP');

    const tripStore = useTripStore();
    tripStore.setSelectedTrip(MOCK_TRIP);

    exportJson(); // now has trip → success
    expect(exportError.value).toBeNull();
  });

  it('isExporting is false after exportJson completes (synchronous operation)', () => {
    const tripStore = useTripStore();
    tripStore.setSelectedTrip(MOCK_TRIP);

    const { exportJson, isExporting } = useExportTrip();
    exportJson();

    expect(isExporting.value).toBe(false);
  });

  // ── exportPdf ────────────────────────────────────────────────────────────

  it('exportPdf calls window.print()', () => {
    const { exportPdf } = useExportTrip();
    exportPdf();

    expect(printSpy).toHaveBeenCalledOnce();
  });

  it('exportPdf works regardless of selectedTrip state', () => {
    const { exportPdf } = useExportTrip();
    exportPdf(); // no trip in store

    expect(printSpy).toHaveBeenCalledOnce();
  });
});
