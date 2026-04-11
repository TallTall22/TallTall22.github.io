<script setup lang="ts">
import DateRangePicker from './components/control-panel/DateRangePicker.vue';
import StadiumSelector from './components/control-panel/StadiumSelector.vue';
import QuickStartPresets from './components/control-panel/QuickStartPresets.vue';
import { useTripStore } from '@/stores/tripStore';
import { useGameFilter } from '@/composables/useGameFilter';
import { useRoutingAlgorithm } from '@/composables/useRoutingAlgorithm';

const store = useTripStore();

// F-04: game filtering pipeline — watches tripGenerationRequestId
const { filteredGames } = useGameFilter();

// F-05: routing algorithm — watches filteredGames, writes store.selectedTrip
// Passed filteredGames explicitly to prevent a second useGameFilter instance.
const { isRouting, routingError } = useRoutingAlgorithm(filteredGames);

// Wire DateRangePicker range-confirmed → trigger routing pipeline
function onRangeConfirmed(_range: { startDate: string; endDate: string }): void {
  store.requestTripGeneration();
}
</script>

<template>
  <v-app>
    <v-app-bar color="primary" dark>
      <v-app-bar-title>⚾ MLB Ballpark Tour Planner</v-app-bar-title>
    </v-app-bar>

    <v-main class="pa-4 main-content">
      <v-container>
        <v-row justify="center">
          <v-col cols="12" md="8" lg="6">
            <!-- F-03: Quick Start Presets -->
            <QuickStartPresets
              class="mb-4"
            />

            <!-- F-02: Home Stadium Selection -->
            <StadiumSelector
              class="mb-4"
            />

            <!-- F-01: Date Range -->
            <DateRangePicker
              @range-confirmed="onRangeConfirmed"
            />

            <!-- F-05: Routing status (interim display until F-06 map) -->
            <div v-if="isRouting" class="mt-4 text-center text-medium-emphasis">
              正在計算最佳路線...
            </div>
            <div v-else-if="routingError" class="mt-4 text-center text-error">
              路線計算失敗：{{ routingError }}
            </div>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<style scoped>
.main-content {
  padding-top: 80px !important;
}
</style>
