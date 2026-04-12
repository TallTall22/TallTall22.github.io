// src/composables/useExportTrip.ts
//
// Responsibility: Encapsulates JSON download and PDF print logic for the
// active Trip.  Internally reads tripStore.selectedTrip — callers never
// touch the store directly.
//
// Async safety: exportJson is synchronous today; isExporting wraps the
// blob operation so callers can reactively disable buttons, and the flag
// is ready for a future async conversion (e.g. server-side PDF generation)
// without changing the public interface.
//
// Memory safety: Blob Object URL is revoked 100 ms after the <a>.click()
// via setTimeout — the delay is intentional to give the browser time to
// start the download before the URL handle is invalidated.

import { ref } from 'vue';
import type { Ref } from 'vue';
import { useTripStore } from '@/stores/tripStore';
import type { ExportErrorCode } from '@/types';

// ── Public interface (return contract) ───────────────────────────────────────

export interface UseExportTripReturn {
  /** Serialises selectedTrip to JSON and triggers a browser download. */
  exportJson(): void;
  /** Opens the native browser print dialog (zero external deps). */
  exportPdf(): void;
  /** True while the blob/download operation is in progress. */
  isExporting: Ref<boolean>;
  /** Set to a typed error code on failure; null when clean. */
  exportError: Ref<ExportErrorCode | null>;
}

// ── Implementation ───────────────────────────────────────────────────────────

export function useExportTrip(): UseExportTripReturn {
  // Pinia setup-store: refs are auto-unwrapped, so tripStore.selectedTrip
  // is Trip | null — not Ref<Trip | null>.
  const tripStore = useTripStore();

  const isExporting = ref<boolean>(false);
  const exportError = ref<ExportErrorCode | null>(null);

  // ── exportJson ─────────────────────────────────────────────────────────────

  function exportJson(): void {
    // Reset previous error on every invocation.
    exportError.value = null;

    const trip = tripStore.selectedTrip;
    if (!trip) {
      exportError.value = 'NO_TRIP';
      return;
    }

    isExporting.value = true;
    try {
      // Serialise with two-space indent for human-readable output.
      const json = JSON.stringify(trip, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);

      const anchor      = document.createElement('a');
      anchor.href       = url;
      anchor.download   = `mlb-trip-${trip.tripId}.json`;
      // Programmatic click does NOT require the element to be in the DOM.
      anchor.click();

      // Revoke the object URL after a short delay to prevent memory leaks.
      // 100 ms gives the browser time to initiate the download before the
      // URL handle is freed.
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } finally {
      // Always reset flag — even if something unexpected throws.
      isExporting.value = false;
    }
  }

  // ── exportPdf ──────────────────────────────────────────────────────────────

  function exportPdf(): void {
    // Delegates entirely to the browser's native print dialog.
    // CSS @media print rules in App.vue control what is visible.
    window.print();
  }

  // ── Return ─────────────────────────────────────────────────────────────────

  return { exportJson, exportPdf, isExporting, exportError };
}
