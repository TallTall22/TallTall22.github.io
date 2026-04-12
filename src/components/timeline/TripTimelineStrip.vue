<script setup lang="ts">
import { useTimeline } from '@/composables/useTimeline';
import { useHighlightStore } from '@/stores/highlightStore';
import TripTimelineCard from './TripTimelineCard.vue';
import type { TripTimelineStripProps } from '@/types/components';

defineProps<TripTimelineStripProps>();

const { timelineDays, isLoading, error } = useTimeline();
const highlightStore = useHighlightStore();
</script>

<template>
  <div class="timeline-strip-wrapper">
    <!-- Loading state -->
    <template v-if="isLoading">
      <div class="timeline-loading">
        <v-progress-linear indeterminate color="primary" />
      </div>
    </template>

    <!-- Error state -->
    <template v-else-if="error">
      <v-alert type="error" density="compact" class="timeline-error">
        {{ error }}
      </v-alert>
    </template>

    <!-- Empty state -->
    <template v-else-if="timelineDays.length === 0">
      <div class="timeline-empty">
        <v-icon icon="mdi-calendar-blank" color="grey-lighten-1" size="28" />
        <span class="timeline-empty-text">Generate a trip to see your itinerary</span>
      </div>
    </template>

    <!-- Cards -->
    <template v-else>
      <div class="timeline-scroll-area" data-testid="timeline-scroll-area">
        <div
          v-for="day in timelineDays"
          :key="day.dayNumber"
          class="timeline-card-item"
          @mouseenter="day.stadiumId !== null ? highlightStore.setHovered(day.stadiumId) : undefined"
          @mouseleave="highlightStore.clearHovered()"
        >
          <TripTimelineCard
            :day="day"
            :is-active="day.stadiumId !== null && highlightStore.hoveredStadiumId === day.stadiumId"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.timeline-strip-wrapper {
  width: 100%;
  min-height: 100px;
  display: flex;
  align-items: center;
  background: #fff;
}

.timeline-scroll-area {
  display: flex;
  flex-direction: row;
  gap: 12px;
  overflow-x: auto;
  padding: 20px 16px 12px;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  width: 100%;
  /* Custom scrollbar styling */
  scrollbar-width: thin;
  scrollbar-color: var(--mlb-primary, #002D72) #e0e0e0;
}

.timeline-scroll-area::-webkit-scrollbar {
  height: 6px;
}

.timeline-scroll-area::-webkit-scrollbar-track {
  background: #e0e0e0;
  border-radius: 3px;
}

.timeline-scroll-area::-webkit-scrollbar-thumb {
  background: var(--mlb-primary, #002D72);
  border-radius: 3px;
}

.timeline-loading {
  width: 100%;
  padding: 16px;
}

.timeline-error {
  margin: 8px 16px;
  width: 100%;
}

.timeline-empty {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  color: #9e9e9e;
}

.timeline-empty-text {
  font-size: 13px;
  color: #9e9e9e;
}
</style>
