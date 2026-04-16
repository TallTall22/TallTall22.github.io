<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import DateRangePicker from './components/control-panel/DateRangePicker.vue';
import StadiumSelector from './components/control-panel/StadiumSelector.vue';
import RoutingModeSelector from './components/control-panel/RoutingModeSelector.vue';
import QuickStartPresets from './components/control-panel/QuickStartPresets.vue';
import TripActionBar from './components/control-panel/TripActionBar.vue';
import MapViewContainer from '@/components/map/MapViewContainer.vue';
import TripTimelineStrip from '@/components/timeline/TripTimelineStrip.vue';
import LoadingStageBar from '@/components/LoadingStageBar.vue';
import { useTripStore } from '@/stores/tripStore';
import { useGameFilter } from '@/composables/useGameFilter';
import { useRoutingAlgorithm } from '@/composables/useRoutingAlgorithm';
import { useTripShare } from '@/composables/useTripShare';
import { useLoadingStage } from '@/composables/useLoadingStage';
import type { RoutingAlgorithmErrorCode } from '@/types/models';

type AppTab = 'plan' | 'map' | 'itinerary';

const store = useTripStore();

// F-04: game filtering pipeline
const { filteredGames, isLoading: isFiltering } = useGameFilter();

// F-05: routing algorithm
const { isRouting, routingError } = useRoutingAlgorithm(filteredGames);

// F-10.3: restore trip from URL param on mount
const { restoreFromUrl } = useTripShare();
onMounted(() => { restoreFromUrl(); });

const isBusy = computed(() => isFiltering.value || isRouting.value);

// F-11: loading stage
const { stage: loadingStage } = useLoadingStage(isFiltering, isRouting);

// ── Tab navigation ──────────────────────────────────────────────────────────
const activeTab = ref<AppTab>('plan');

// Auto-switch tabs based on trip lifecycle
watch(() => store.selectedTrip, (newTrip, oldTrip) => {
  if (newTrip !== null && oldTrip === null) {
    // Trip generated → show map
    activeTab.value = 'map';
  } else if (newTrip === null && oldTrip !== null) {
    // Trip reset → back to plan
    activeTab.value = 'plan';
  }
});

// Show map tab when routing error occurs so user sees it
watch(routingError, (err) => {
  if (err !== null) {
    activeTab.value = 'map';
  }
});

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

function onRangeConfirmed(_range: { startDate: string; endDate: string }): void {
  store.requestTripGeneration();
}
</script>

<template>
  <v-app>
    <v-app-bar color="primary" elevation="2">
      <v-app-bar-title class="font-weight-bold">⚾ MLB Ballpark Tour Planner</v-app-bar-title>
    </v-app-bar>

    <v-main class="app-main">
      <div class="app-layout">
        <!-- F-11: stage-aware loading indicator -->
        <LoadingStageBar :stage="loadingStage" />

        <!-- Tab bar -->
        <v-tabs
          v-model="activeTab"
          color="primary"
          align-tabs="center"
          bg-color="white"
          density="comfortable"
          class="app-tabs"
        >
          <v-tab value="plan" prepend-icon="mdi-tune-variant">行程規劃</v-tab>
          <v-tab value="map"  prepend-icon="mdi-map-outline">路線地圖</v-tab>
          <v-tab
            value="itinerary"
            prepend-icon="mdi-calendar-month-outline"
            :disabled="!store.selectedTrip"
          >
            行程表
          </v-tab>
        </v-tabs>

        <v-divider />

        <!-- Panel area -->
        <div class="panels-area">
          <v-window v-model="activeTab" class="panels-window">

            <!-- Tab 1: 行程規劃 -->
            <v-window-item value="plan" class="plan-item">
              <div class="plan-scroll">
                <div class="plan-panel">
                  <!-- F-10: Reset / Export / Share -->
                  <TripActionBar :is-busy="isBusy" class="mb-6" />
                  <v-divider class="mb-6" />
                  <!-- F-03: Quick Start Presets -->
                  <QuickStartPresets :disabled="isBusy" class="mb-6" />
                  <!-- F-02: Home Stadium -->
                  <StadiumSelector class="mb-4" />
                  <!-- F-05: Routing Mode -->
                  <RoutingModeSelector :disabled="isBusy" class="mb-4" />
                  <!-- F-01: Date Range -->
                  <DateRangePicker :readonly="isBusy" @range-confirmed="onRangeConfirmed" />
                </div>
              </div>
            </v-window-item>

            <!-- Tab 2: 路線地圖 (eager = Leaflet initialises immediately) -->
            <v-window-item value="map" class="map-item" eager>
              <MapViewContainer
                :is-loading="isBusy"
                :has-error="!!routingError"
                :error-msg="routingErrorMessage"
                :on-retry="store.requestTripGeneration"
              />
            </v-window-item>

            <!-- Tab 3: 行程表 -->
            <v-window-item value="itinerary" class="itinerary-item">
              <TripTimelineStrip />
            </v-window-item>

          </v-window>
        </div>
      </div>
    </v-main>
  </v-app>
</template>

<style scoped>
/* v-main fills the remaining viewport (Vuetify handles padding-top via layout system) */
.app-main {
  height: 100vh;
}

/* Full-height flex column — stacks LoadingStageBar + tabs + panels */
.app-layout {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.app-tabs {
  flex-shrink: 0;
}

/* Panels area fills remaining space after tabs */
.panels-area {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* v-window and its internal container must fill panels-area */
:deep(.panels-window),
:deep(.panels-window > .v-window__container) {
  height: 100%;
}

/* ── Plan tab ───────────────────────────────── */
.plan-item {
  height: 100%;
}

.plan-scroll {
  height: 100%;
  overflow-y: auto;
}

.plan-panel {
  max-width: 640px;
  margin: 0 auto;
  padding: 32px 24px 64px;
}

/* ── Map tab ────────────────────────────────── */
.map-item {
  height: 100%;
}

/* ── Itinerary tab ──────────────────────────── */
.itinerary-item {
  height: 100%;
  display: flex;
  align-items: center;     /* vertically center the timeline strip */
  overflow-y: auto;
}
</style>

<!-- Print: hide nav chrome, show plan content only -->
<style>
@media print {
  .app-tabs,
  .v-app-bar,
  .v-divider {
    display: none !important;
  }
  .plan-panel {
    max-width: 100% !important;
    padding: 0 !important;
  }
  .panels-area {
    height: auto !important;
    overflow: visible !important;
  }
}
</style>
