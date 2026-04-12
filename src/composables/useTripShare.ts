// src/composables/useTripShare.ts
import { ref } from 'vue';
import type { Ref } from 'vue';
import { useTripStore } from '@/stores/tripStore';
import type { ExportErrorCode } from '@/types';

/** Internal payload — only input parameters, not the full Trip object */
interface TripSharePayload {
  s: string; // startDate
  e: string; // endDate
  h: string; // homeStadiumId
}

export interface UseTripShareReturn {
  shareTrip(): Promise<void>;
  restoreFromUrl(): void;
  shareError: Ref<ExportErrorCode | null>;
  isSharing: Ref<boolean>;
}

function encodePayload(payload: TripSharePayload): string {
  return btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function decodePayload(encoded: string): TripSharePayload | null {
  try {
    // Restore URL-safe base64 to standard base64
    const standard = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const padded = standard + '=='.slice(0, (4 - (standard.length % 4)) % 4);
    const json = atob(padded);
    const parsed = JSON.parse(json) as unknown;
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as Record<string, unknown>).s === 'string' &&
      typeof (parsed as Record<string, unknown>).e === 'string' &&
      typeof (parsed as Record<string, unknown>).h === 'string' &&
      (parsed as Record<string, unknown>).s !== '' &&
      (parsed as Record<string, unknown>).e !== '' &&
      (parsed as Record<string, unknown>).h !== ''
    ) {
      return parsed as TripSharePayload;
    }
    return null;
  } catch {
    return null;
  }
}

export function useTripShare(): UseTripShareReturn {
  const tripStore = useTripStore();
  const shareError = ref<ExportErrorCode | null>(null);
  const isSharing = ref<boolean>(false);

  async function shareTrip(): Promise<void> {
    shareError.value = null;
    const selectedTrip = tripStore.selectedTrip;
    const startDate = tripStore.startDate;
    const endDate = tripStore.endDate;
    const homeStadiumId = tripStore.homeStadiumId;

    if (!selectedTrip || !startDate || !endDate || !homeStadiumId) {
      shareError.value = 'NO_TRIP';
      return;
    }

    isSharing.value = true;
    try {
      let encoded: string;
      try {
        encoded = encodePayload({ s: startDate, e: endDate, h: homeStadiumId });
      } catch {
        shareError.value = 'ENCODE_FAIL';
        return;
      }

      window.history.replaceState({}, '', `?trip=${encoded}`);
      const shareUrl = window.location.href;

      try {
        await navigator.clipboard.writeText(shareUrl);
      } catch {
        // Fallback for non-HTTPS or user-gesture-less contexts
        try {
          const textArea = document.createElement('textarea');
          textArea.value = shareUrl;
          textArea.style.cssText = 'position:fixed;opacity:0;pointer-events:none;';
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
        } catch {
          shareError.value = 'CLIPBOARD_FAIL';
        }
      }
    } finally {
      isSharing.value = false;
    }
  }

  function restoreFromUrl(): void {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get('trip');
    if (!encoded) return;

    const payload = decodePayload(encoded);
    if (!payload) {
      // Invalid param — silently remove it and continue
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    tripStore.setStartDate(payload.s);
    tripStore.setEndDate(payload.e);
    tripStore.setHomeStadium(payload.h);
    tripStore.requestTripGeneration();
  }

  return { shareTrip, restoreFromUrl, shareError, isSharing };
}
