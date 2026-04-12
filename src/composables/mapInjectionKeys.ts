// src/composables/mapInjectionKeys.ts
import type { InjectionKey, ShallowRef } from 'vue';
import type { Map as LeafletMap } from 'leaflet';

/** Provided by MapViewContainer; injected by MapPolylineLayer, MapBoundsManager */
export const LEAFLET_MAP_KEY: InjectionKey<ShallowRef<LeafletMap | null>> = Symbol('leaflet-map');
