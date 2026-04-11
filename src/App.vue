<script setup lang="ts">
import { computed } from 'vue';
import DateRangePicker from './components/control-panel/DateRangePicker.vue';
import StadiumSelector from './components/control-panel/StadiumSelector.vue';
import QuickStartPresets from './components/control-panel/QuickStartPresets.vue';
import { useTripStore } from '@/stores/tripStore';
import { useGameFilter } from '@/composables/useGameFilter';
import { useRoutingAlgorithm } from '@/composables/useRoutingAlgorithm';
import type { RoutingAlgorithmErrorCode } from '@/types/models';

const store = useTripStore();

// F-04: game filtering pipeline — watches tripGenerationRequestId
const { filteredGames, isLoading: isFiltering } = useGameFilter();

// F-05: routing algorithm — watches filteredGames, writes store.selectedTrip
// Passed filteredGames explicitly to prevent a second useGameFilter instance.
const { isRouting, routingError } = useRoutingAlgorithm(filteredGames);

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
              :disabled="isBusy"
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
            <div v-else-if="routingErrorMessage" class="mt-4 text-center text-error">
              路線計算失敗：{{ routingErrorMessage }}
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
