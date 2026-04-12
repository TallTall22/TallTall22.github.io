<script setup lang="ts">
import { computed, onMounted } from 'vue';
import DateRangePicker from './components/control-panel/DateRangePicker.vue';
import StadiumSelector from './components/control-panel/StadiumSelector.vue';
import QuickStartPresets from './components/control-panel/QuickStartPresets.vue';
import TripActionBar from './components/control-panel/TripActionBar.vue';
import MapViewContainer from '@/components/map/MapViewContainer.vue';
import TripTimelineStrip from '@/components/timeline/TripTimelineStrip.vue';
import { useTripStore } from '@/stores/tripStore';
import { useGameFilter } from '@/composables/useGameFilter';
import { useRoutingAlgorithm } from '@/composables/useRoutingAlgorithm';
import { useTripShare } from '@/composables/useTripShare';
import type { RoutingAlgorithmErrorCode } from '@/types/models';

const store = useTripStore();

// F-04: game filtering pipeline — watches tripGenerationRequestId
const { filteredGames, isLoading: isFiltering } = useGameFilter();

// F-05: routing algorithm — watches filteredGames, writes store.selectedTrip
// Passed filteredGames explicitly to prevent a second useGameFilter instance.
const { isRouting, routingError } = useRoutingAlgorithm(filteredGames);

// F-10.3: restore trip state from URL param on mount
const { restoreFromUrl } = useTripShare();
onMounted(() => { restoreFromUrl(); });

const isBusy = computed(() => isFiltering.value || isRouting.value);

const routingErrorMessage = computed<string | null>(() => {
  if (!routingError.value) return null;
  const messages: Record<RoutingAlgorithmErrorCode, string> = {
    NO_GAMES:            '選定期間內找不到可用的比賽，請調整日期範圍',
    NO_HOME_STADIUM:     '起點球場設定無效，請重新選擇',
    STADIUM_LOAD_FAILED: '球場資料載入失敗，請重新整理頁面',
    EMPTY_ITINERARY:     '無法生成行程，請縮短旅程天數後再試',
  };
  return messages[routingError.value];
});

// Wire DateRangePicker range-confirmed → trigger routing pipeline
function onRangeConfirmed(_range: { startDate: string; endDate: string }): void {
  store.requestTripGeneration();
}
</script>

<template>
  <v-app>
    <v-app-bar color="primary" dark elevation="2">
      <v-app-bar-title>⚾ MLB Ballpark Tour Planner</v-app-bar-title>
    </v-app-bar>

    <v-main class="main-content">
      <div class="main-layout">
        <!-- Top: two-column row (control panel + map) -->
        <v-row no-gutters align="stretch" class="top-row">
          <!-- Left: Control Panel -->
          <v-col cols="12" md="5" lg="4" class="control-panel-col">
            <div class="control-panel-inner pa-4">
              <!-- F-10: Trip Action Bar (Reset / Export / Share) -->
              <TripActionBar :is-busy="isBusy" class="mb-4" />

              <!-- F-03: Quick Start Presets -->
              <QuickStartPresets class="mb-4" :disabled="isBusy" />

              <!-- F-02: Home Stadium Selection -->
              <StadiumSelector class="mb-4" />

              <!-- F-01: Date Range -->
              <DateRangePicker :readonly="isBusy" @range-confirmed="onRangeConfirmed" />
            </div>
          </v-col>

          <!-- Right: Map -->
          <v-col cols="12" md="7" lg="8" class="map-col">
            <MapViewContainer
              :is-loading="isBusy"
              :has-error="!!routingError"
              :error-msg="routingErrorMessage"
            />
          </v-col>
        </v-row>

        <!-- Bottom: F-08 Timeline Strip -->
        <div class="timeline-row">
          <TripTimelineStrip />
        </div>
      </div>
    </v-main>
  </v-app>
</template>

<style scoped>
.main-content {
  padding-top: var(--v-layout-top);
  height: 100vh;
}

.main-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.top-row {
  flex: 1;
  min-height: 0; /* allow flex child to shrink below content size */
  overflow: hidden;
}

.control-panel-col {
  overflow-y: auto;
  border-right: 1px solid rgba(0, 0, 0, 0.12);
  background: #f5f5f5;
  height: 100%;
}

.control-panel-inner {
  max-width: 480px;
}

.map-col {
  height: 100%;
  min-height: 0;
}

.timeline-row {
  height: 180px;
  min-height: 180px;
  max-height: 180px;
  overflow: hidden;
  border-top: 1px solid rgba(0, 0, 0, 0.12);
  background: #fff;
}
</style>

<!-- F-10.2: Print stylesheet — hides map/timeline; formats control panel for PDF/print -->
<style>
@media print {
  .map-col,
  .timeline-row,
  .v-app-bar {
    display: none !important;
  }

  .control-panel-col {
    width: 100% !important;
    max-width: 100% !important;
    border-right: none !important;
    overflow: visible !important;
  }

  .main-content {
    padding-top: 0 !important;
    height: auto !important;
  }

  .main-layout {
    height: auto !important;
  }

  .top-row {
    overflow: visible !important;
  }
}
</style>
