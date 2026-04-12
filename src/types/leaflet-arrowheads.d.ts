// src/types/leaflet-arrowheads.d.ts
import 'leaflet';

declare module 'leaflet' {
  interface ArrowheadsOptions {
    /** Arrow frequency: 'allvertices' | 'endonly' | number (meters) */
    frequency?: string | number;
    /** Size of each arrowhead e.g. '12px' or '5%' */
    size?:      string;
    fill?:      boolean;
    yawn?:      number;
    color?:     string;
    opacity?:   number;
  }

  interface Polyline {
    arrowheads(options?: ArrowheadsOptions): this;
    getArrows(): Layer[];
  }
}
