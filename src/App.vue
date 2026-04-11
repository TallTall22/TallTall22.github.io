<script setup lang="ts">
import DateRangePicker from './components/control-panel/DateRangePicker.vue';
import StadiumSelector from './components/control-panel/StadiumSelector.vue';
import QuickStartPresets from './components/control-panel/QuickStartPresets.vue';
import type { PresetAppliedEvent } from './types/presets';

function onPresetApplied(event: PresetAppliedEvent): void {
  // F-04 integration hook: replace this with routing algorithm trigger
  // eslint-disable-next-line no-console
  console.info('[F-03] preset-applied', event);
}

function onRangeConfirmed(_range: { startDate: string; endDate: string }): void {
  // F-04 integration hook: trigger game filtering when date range is confirmed
}
</script>

<template>
  <v-app>
    <v-app-bar color="primary" dark>
      <v-app-bar-title>⚾ MLB Ballpark Tour Planner</v-app-bar-title>
    </v-app-bar>

    <v-main class="pa-4" style="padding-top: 80px !important">
      <v-container>
        <v-row justify="center">
          <v-col cols="12" md="8" lg="6">
            <!-- F-03: Quick Start Presets -->
            <QuickStartPresets
              class="mb-4"
              @preset-applied="onPresetApplied"
            />

            <!-- F-02: Home Stadium Selection -->
            <StadiumSelector
              class="mb-4"
            />

            <!-- F-01: Date Range -->
            <DateRangePicker
              @range-confirmed="onRangeConfirmed"
            />
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<style scoped></style>
