<script setup lang="ts">
defineProps<{ visible: boolean }>();
</script>

<template>
  <Transition name="fade">
    <div v-if="visible" class="map-loading-overlay">
      <v-progress-circular
        indeterminate
        color="#002D72"
        size="56"
        width="5"
      />
    </div>
  </Transition>
</template>

<style scoped>
.map-loading-overlay {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(2px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
