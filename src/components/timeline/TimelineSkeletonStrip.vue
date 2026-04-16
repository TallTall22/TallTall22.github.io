<script setup lang="ts">
import TimelineSkeletonCard from './TimelineSkeletonCard.vue';
const CARD_COUNT = 8;
</script>

<template>
  <div
    class="skeleton-scroll-area"
    data-testid="timeline-skeleton-strip"
    aria-label="載入中..."
    aria-busy="true"
  >
    <TimelineSkeletonCard v-for="i in CARD_COUNT" :key="i" />
  </div>
</template>

<style scoped>
.skeleton-scroll-area {
  display: flex;
  flex-direction: row;
  gap: 12px;
  overflow-x: auto;
  padding: 20px 16px 12px;
  width: 100%;
  scrollbar-width: none;
}
.skeleton-scroll-area::-webkit-scrollbar { display: none; }
</style>
