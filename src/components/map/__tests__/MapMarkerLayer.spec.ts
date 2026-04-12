// src/components/map/__tests__/MapMarkerLayer.spec.ts
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { shallowRef, nextTick } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { LEAFLET_MAP_KEY } from '@/composables/mapInjectionKeys';
import type { StadiumMarkerData, MarkerStatus } from '@/types';

// ── Leaflet Mock ───────────────────────────────────────────────────────────────
// Use vi.hoisted() so mock instances are available inside the vi.mock() factory
// (vi.mock calls are hoisted to the top of the file before const declarations).

const { mockLayerGroupInstance, mockMarkerInstance } = vi.hoisted(() => ({
  mockLayerGroupInstance: {
    addLayer:    vi.fn().mockReturnThis(),
    clearLayers: vi.fn().mockReturnThis(),
    remove:      vi.fn().mockReturnThis(),
    addTo:       vi.fn().mockReturnThis(),
  },
  mockMarkerInstance: {
    bindPopup:   vi.fn().mockReturnThis(),
    bindTooltip: vi.fn().mockReturnThis(),
    on:          vi.fn().mockReturnThis(),
  },
}));

vi.mock('leaflet', () => ({
  default: {
    layerGroup: vi.fn(() => mockLayerGroupInstance),
    marker:     vi.fn(() => mockMarkerInstance),
    point:      vi.fn((x: number, y: number) => ({ x, y })),
    divIcon:    vi.fn((opts: unknown) => opts),
  },
}));

// Import after mock is registered
import L from 'leaflet';
import MapMarkerLayer from '@/components/map/MapMarkerLayer.vue';

// ── Fake L.Map instance ────────────────────────────────────────────────────────
const mockMapInstance = {} as unknown as L.Map;

// ── Fixture factory ────────────────────────────────────────────────────────────
function makeMarker(id: string, status: MarkerStatus = 'unscheduled'): StadiumMarkerData {
  return {
    stadiumId:       id,
    teamName:        `Team ${id}`,
    teamNickname:    id,
    stadiumName:     `${id} Stadium`,
    city:            'City',
    state:           'ST',
    lat:             40.0,
    lng:             -74.0,
    logoUrl:         `/logo/${id}.svg`,
    stadiumPhotoUrl: `/img/${id}.jpg`,
    status,
  };
}

// ── Mount helper ───────────────────────────────────────────────────────────────
function mountComponent(
  markers: StadiumMarkerData[],
  mapValue: L.Map | null = mockMapInstance,
) {
  const mapRef = shallowRef(mapValue);
  const pinia  = createPinia();
  setActivePinia(pinia);
  return {
    wrapper: mount(MapMarkerLayer, {
      props: { markers },
      global: {
        plugins: [pinia],
        provide: {
          [LEAFLET_MAP_KEY as symbol]: mapRef,
        },
      },
    }),
    mapRef,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('MapMarkerLayer', () => {
  beforeEach(() => {
    // Reset call counts between tests; mock implementations (mockReturnThis) are preserved.
    vi.clearAllMocks();
  });

  // ── Test 1 ────────────────────────────────────────────────────────────────────
  describe('mount with empty markers array', () => {
    it('does NOT call L.layerGroup (drawMarkers guard: markers.length === 0)', () => {
      mountComponent([]);
      expect(L.layerGroup).not.toHaveBeenCalled();
    });

    it('does NOT call L.marker', () => {
      mountComponent([]);
      expect(L.marker).not.toHaveBeenCalled();
    });
  });

  // ── Test 2 ────────────────────────────────────────────────────────────────────
  describe('mount with markers — layerGroup created and markers added', () => {
    it('calls L.layerGroup() exactly once', () => {
      mountComponent([makeMarker('NYY'), makeMarker('BOS')]);
      expect(L.layerGroup).toHaveBeenCalledTimes(1);
    });

    it('calls layerGroup.addTo(map) exactly once', () => {
      mountComponent([makeMarker('NYY'), makeMarker('BOS')]);
      expect(mockLayerGroupInstance.addTo).toHaveBeenCalledWith(mockMapInstance);
      expect(mockLayerGroupInstance.addTo).toHaveBeenCalledTimes(1);
    });

    it('calls L.marker() once per marker (2 markers → 2 calls)', () => {
      mountComponent([makeMarker('NYY'), makeMarker('BOS')]);
      expect(L.marker).toHaveBeenCalledTimes(2);
    });

    it('calls layerGroup.addLayer() once per marker (2 markers → 2 calls)', () => {
      mountComponent([makeMarker('NYY'), makeMarker('BOS')]);
      expect(mockLayerGroupInstance.addLayer).toHaveBeenCalledTimes(2);
    });

    it('each marker has bindPopup and bindTooltip called', () => {
      mountComponent([makeMarker('NYY'), makeMarker('BOS')]);
      expect(mockMarkerInstance.bindPopup).toHaveBeenCalledTimes(2);
      expect(mockMarkerInstance.bindTooltip).toHaveBeenCalledTimes(2);
    });
  });

  // ── Test 3 ────────────────────────────────────────────────────────────────────
  describe('prop update — clearLayers called then markers re-added', () => {
    it('calls clearLayers() when markers prop is replaced', async () => {
      const { wrapper } = mountComponent([makeMarker('NYY')]);
      // Initial mount: 1 marker drawn, no clearLayers yet
      expect(mockLayerGroupInstance.clearLayers).not.toHaveBeenCalled();

      await wrapper.setProps({ markers: [makeMarker('NYY'), makeMarker('BOS')] });
      await nextTick();

      expect(mockLayerGroupInstance.clearLayers).toHaveBeenCalledTimes(1);
    });

    it('calls L.marker() for all markers across both draws (1 + 2 = 3 total)', async () => {
      const { wrapper } = mountComponent([makeMarker('NYY')]);
      await wrapper.setProps({ markers: [makeMarker('NYY'), makeMarker('BOS')] });
      await nextTick();

      expect(L.marker).toHaveBeenCalledTimes(3);
    });

    it('calls layerGroup.addLayer() for all markers across both draws (1 + 2 = 3 total)', async () => {
      const { wrapper } = mountComponent([makeMarker('NYY')]);
      await wrapper.setProps({ markers: [makeMarker('NYY'), makeMarker('BOS')] });
      await nextTick();

      expect(mockLayerGroupInstance.addLayer).toHaveBeenCalledTimes(3);
    });

    it('does NOT call L.layerGroup() again on prop update (reuses existing layerGroup)', async () => {
      const { wrapper } = mountComponent([makeMarker('NYY')]);
      await wrapper.setProps({ markers: [makeMarker('NYY'), makeMarker('BOS')] });
      await nextTick();

      // L.layerGroup should still only have been called once (on initial mount)
      expect(L.layerGroup).toHaveBeenCalledTimes(1);
    });
  });

  // ── Test 4 ────────────────────────────────────────────────────────────────────
  describe('unmount — cleanup', () => {
    it('calls layerGroup.remove() on beforeUnmount', () => {
      const { wrapper } = mountComponent([makeMarker('NYY')]);
      expect(mockLayerGroupInstance.remove).not.toHaveBeenCalled();

      wrapper.unmount();

      expect(mockLayerGroupInstance.remove).toHaveBeenCalledTimes(1);
    });

    it('does NOT call layerGroup.remove() if no layerGroup was created (empty markers)', () => {
      const { wrapper } = mountComponent([]);
      wrapper.unmount();

      expect(mockLayerGroupInstance.remove).not.toHaveBeenCalled();
    });
  });

  // ── Test 5 ────────────────────────────────────────────────────────────────────
  describe('map not ready — drawMarkers skips gracefully', () => {
    it('does NOT call L.layerGroup when map is null', () => {
      mountComponent([makeMarker('NYY'), makeMarker('BOS')], null);
      expect(L.layerGroup).not.toHaveBeenCalled();
    });

    it('does NOT call L.marker when map is null', () => {
      mountComponent([makeMarker('NYY')], null);
      expect(L.marker).not.toHaveBeenCalled();
    });
  });
});
